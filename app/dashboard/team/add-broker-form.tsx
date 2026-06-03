"use client";

import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { addBrokerDirectly } from "@/lib/actions/agencies";
import { Loader2, User, Mail, Phone, UserPlus } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(1, "Broker name is required").max(100),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

export function AddBrokerForm() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  async function onSubmit(data: FormData) {
    try {
      const result = await addBrokerDirectly({
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || null,
      });
      if (result.ok) {
        if (result.emailSent === false) {
          toast.warning(
            result.warning ?? `${data.name} added, but the Set Password email failed to send.`,
          );
        } else {
          toast.success(`${data.name} added. A Set Password email has been sent.`);
        }
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="direct-name" className="text-sm font-medium">
            Full name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="direct-name"
              type="text"
              placeholder="Jane Smith"
              className={`pl-9 h-10 ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
              {...register("name")}
            />
          </div>
          <FieldError message={errors.name?.message} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="direct-email" className="text-sm font-medium">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="direct-email"
              type="email"
              autoComplete="off"
              placeholder="broker@example.com"
              className={`pl-9 h-10 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
              {...register("email")}
            />
          </div>
          <FieldError message={errors.email?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="direct-phone" className="text-sm font-medium">
          Phone <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="direct-phone"
            type="tel"
            autoComplete="off"
            placeholder="+61 4xx xxx xxx"
            className={`pl-9 h-10 ${errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
            {...register("phone")}
          />
        </div>
        <FieldError message={errors.phone?.message} />
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        <p className="text-xs text-muted-foreground mr-auto">
          Broker will receive an email with a link to set their password.
        </p>
        <Button type="submit" disabled={isSubmitting} className="h-10">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating…
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Add broker
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
