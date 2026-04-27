"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  createDiscountCode,
  updateDiscountCode,
} from "@/lib/actions/discount-codes";
import type { DiscountCode } from "@/lib/types/discount-codes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { Loader2 } from "lucide-react";

const schema = z.object({
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(32, "Code is too long")
    .regex(/^[A-Za-z0-9_-]+$/, "Letters, digits, underscore and dash only"),
  description: z.string().max(500).optional().or(z.literal("")),
  percent_off: z.string().min(1, "Required"),
  max_uses: z.string().optional().or(z.literal("")),
  valid_until: z.string().optional().or(z.literal("")),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  code?: DiscountCode;
};

function isoToInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  // <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DiscountCodeForm({ code }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = !!code;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: code?.code ?? "",
      description: code?.description ?? "",
      percent_off: code ? String(code.percent_off) : "100",
      max_uses: code?.max_uses != null ? String(code.max_uses) : "",
      valid_until: isoToInputValue(code?.valid_until),
      active: code?.active ?? true,
    },
  });

  const active = watch("active");

  async function onSubmit(values: FormValues) {
    const percent = parseInt(values.percent_off, 10);
    if (Number.isNaN(percent) || percent < 1 || percent > 100) {
      toast.error("Percent off must be 1-100");
      return;
    }
    let maxUses: number | null = null;
    if (values.max_uses && values.max_uses.trim()) {
      maxUses = parseInt(values.max_uses, 10);
      if (Number.isNaN(maxUses) || maxUses < 1) {
        toast.error("Max uses must be a positive number");
        return;
      }
    }

    const validUntilIso = values.valid_until?.trim()
      ? new Date(values.valid_until).toISOString()
      : null;

    setSubmitting(true);
    try {
      const payload = {
        code: values.code,
        description: values.description || null,
        percent_off: percent,
        max_uses: maxUses,
        valid_until: validUntilIso,
        active: values.active,
      };

      const res = isEdit && code
        ? await updateDiscountCode(code.id, payload)
        : await createDiscountCode(payload);

      if (res.ok) {
        toast.success(isEdit ? "Code updated" : "Code created");
        router.refresh();
        router.push("/admin/discount-codes");
      } else {
        toast.error(res.error ?? `Failed to ${isEdit ? "update" : "create"} code`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
      <div className="space-y-2">
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          {...register("code", {
            onChange: (e) => {
              e.target.value = e.target.value.toUpperCase();
            },
          })}
          placeholder="e.g. WELCOME100"
          className="font-mono"
          maxLength={32}
        />
        <p className="text-xs text-muted-foreground">
          Brokers type this exact code at checkout. Letters, digits, underscore and dash only — case is normalized to uppercase.
        </p>
        <FieldError message={errors.code?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (admin only)</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="What this code is for, who it's intended for…"
          rows={2}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="percent_off">Percent off</Label>
        <div className="relative">
          <Input
            id="percent_off"
            type="number"
            min="1"
            max="100"
            step="1"
            {...register("percent_off")}
            className="pr-8"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            %
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          A 100% code makes checkout free — no card required, listing activates immediately.
        </p>
        <FieldError message={errors.percent_off?.message} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="max_uses">Max uses (optional)</Label>
          <Input
            id="max_uses"
            type="number"
            min="1"
            step="1"
            {...register("max_uses")}
            placeholder="Unlimited"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty for unlimited reuse.
          </p>
          <FieldError message={errors.max_uses?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="valid_until">Expires on (optional)</Label>
          <Input
            id="valid_until"
            type="datetime-local"
            {...register("valid_until")}
          />
          <p className="text-xs text-muted-foreground">
            Leave empty for no expiry.
          </p>
          <FieldError message={errors.valid_until?.message} />
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-lg border p-3">
        <input
          id="active"
          type="checkbox"
          checked={active}
          onChange={(e) => setValue("active", e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <div className="flex-1">
          <Label htmlFor="active" className="cursor-pointer">
            Active
          </Label>
          <p className="text-xs text-muted-foreground">
            Inactive codes cannot be redeemed at checkout.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={submitting} className="gap-1.5">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create code"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/discount-codes")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
