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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { FieldError } from "@/components/ui/field-error";
import { Loader2, Sparkles } from "lucide-react";

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
  const percentOff = watch("percent_off");
  const isFullDiscount = parseInt(percentOff || "0", 10) === 100;

  async function onSubmit(values: FormValues) {
    const percent = parseInt(values.percent_off, 10);
    if (Number.isNaN(percent) || percent < 1 || percent > 100) {
      toast.error("Percent off must be between 1 and 100");
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-xl">
      {/* Code */}
      <div className="space-y-2">
        <Label htmlFor="code" className="text-sm">
          Code
        </Label>
        <Input
          id="code"
          {...register("code", {
            onChange: (e) => {
              e.target.value = e.target.value.toUpperCase();
            },
          })}
          placeholder="WELCOME100"
          className="font-mono tracking-wide h-10"
          maxLength={32}
        />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Brokers type this exact code at checkout. Letters, digits, underscore and dash only. Stored uppercase.
        </p>
        <FieldError message={errors.code?.message} />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm">
          Description
          <span className="text-muted-foreground font-normal ml-1">(internal)</span>
        </Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="What this code is for, who it's intended for, expected usage..."
          rows={2}
          className="resize-none"
        />
        <FieldError message={errors.description?.message} />
      </div>

      <Separator />

      {/* Discount + limits row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label htmlFor="percent_off" className="text-sm">
            Percent off
          </Label>
          <div className="relative">
            <Input
              id="percent_off"
              type="number"
              min="1"
              max="100"
              step="1"
              {...register("percent_off")}
              className="pr-9 h-10 tabular-nums"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground select-none">
              %
            </span>
          </div>
          {isFullDiscount ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed flex items-start gap-1.5">
              <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
              100% off. Stripe processes the $0 checkout natively.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Stripe collects the discounted total when the broker checks out.
            </p>
          )}
          <FieldError message={errors.percent_off?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_uses" className="text-sm">
            Max uses
            <span className="text-muted-foreground font-normal ml-1">(optional)</span>
          </Label>
          <Input
            id="max_uses"
            type="number"
            min="1"
            step="1"
            {...register("max_uses")}
            placeholder="Unlimited"
            className="h-10 tabular-nums"
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Leave empty for unlimited reuse.
          </p>
          <FieldError message={errors.max_uses?.message} />
        </div>
      </div>

      {/* Expiry */}
      <div className="space-y-2 max-w-xs">
        <Label htmlFor="valid_until" className="text-sm">
          Expires on
          <span className="text-muted-foreground font-normal ml-1">(optional)</span>
        </Label>
        <Input
          id="valid_until"
          type="datetime-local"
          {...register("valid_until")}
          className="h-10"
        />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Leave empty for no expiry.
        </p>
        <FieldError message={errors.valid_until?.message} />
      </div>

      <Separator />

      {/* Active toggle */}
      <div className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 px-4 py-3.5">
        <div className="space-y-0.5">
          <Label htmlFor="active" className="text-sm cursor-pointer">
            Active
          </Label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Inactive codes return an error at checkout. You can flip this anytime.
          </p>
        </div>
        <Switch
          id="active"
          checked={active}
          onCheckedChange={(v) => setValue("active", v)}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={submitting} className="gap-1.5">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create code"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/admin/discount-codes")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
