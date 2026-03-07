"use client";

import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { inviteBroker } from "@/lib/actions/agencies";
import { Loader2, Mail, Send } from "lucide-react";
import { useRouter } from "next/navigation";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormData = z.infer<typeof schema>;

export function InviteForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: FormData) {
    try {
      const result = await inviteBroker(data.email.trim());
      if (result.ok) {
        toast.success(`Invitation sent to ${data.email}`);
        reset();
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="invite-email" className="text-sm font-medium">
            Broker email address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="invite-email"
              type="email"
              placeholder="broker@example.com"
              className={`pl-9 h-10 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
              {...register("email")}
            />
          </div>
        </div>
        <Button type="submit" disabled={isSubmitting} className="h-10">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send invite
            </>
          )}
        </Button>
      </div>
      <FieldError message={errors.email?.message} />
    </form>
  );
}
