"use client";

import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Mail, Phone, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitBrokerProfileContact } from "@/lib/actions/broker-profile-contacts";

const contactSchema = z.object({
  message: z.string().min(10, "Message must be at least 10 characters"),
  contact_name: z.string(),
  contact_email: z.string().email("Enter a valid email address"),
  contact_phone: z.string(),
  consent_marketing: z.boolean(),
});

type ContactFormData = z.infer<typeof contactSchema>;

type Props = {
  brokerId: string;
  brokerName: string;
};

export function BrokerProfileContactForm({ brokerId, brokerName }: Props) {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      message: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      consent_marketing: false,
    },
  });

  const consentMarketing = useWatch({ control, name: "consent_marketing" });

  async function onSubmit(data: ContactFormData) {
    const formData = new FormData();
    formData.set("message", data.message);
    formData.set("contact_email", data.contact_email);
    if (data.contact_name) formData.set("contact_name", data.contact_name);
    if (data.contact_phone) formData.set("contact_phone", data.contact_phone);
    formData.set("consent_marketing", data.consent_marketing ? "true" : "false");

    const result = await submitBrokerProfileContact(brokerId, formData);
    if (result.ok) {
      setSubmitted(true);
      reset();
      toast.success("Message sent. The broker will contact you soon.");
    } else {
      toast.error(result.error ?? "Failed to send message.");
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-base">Message sent</CardTitle>
          <CardDescription>
            Thanks for contacting {brokerName}. They will be in touch shortly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setSubmitted(false)}
          >
            Send another message
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contact {brokerName}</CardTitle>
        <CardDescription>
          Send a message and your contact details will be shared with this broker.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="profile-contact-message">Message *</Label>
            <Textarea
              id="profile-contact-message"
              rows={4}
              placeholder="Tell the broker what you would like to discuss..."
              className={`resize-none ${errors.message ? "border-destructive focus-visible:ring-destructive" : ""}`}
              {...register("message")}
            />
            <FieldError message={errors.message?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-contact-name">Your name (optional)</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="profile-contact-name"
                type="text"
                placeholder="Name"
                className={`pl-9 ${errors.contact_name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                {...register("contact_name")}
              />
            </div>
            <FieldError message={errors.contact_name?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-contact-email">Your email *</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="profile-contact-email"
                type="email"
                placeholder="you@example.com"
                className={`pl-9 ${errors.contact_email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                {...register("contact_email")}
              />
            </div>
            <FieldError message={errors.contact_email?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="profile-contact-phone">Phone (optional)</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="profile-contact-phone"
                type="tel"
                placeholder="Phone number"
                className={`pl-9 ${errors.contact_phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
                {...register("contact_phone")}
              />
            </div>
            <FieldError message={errors.contact_phone?.message} />
          </div>

          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
            <Checkbox
              id="profile-contact-consent"
              checked={consentMarketing}
              onCheckedChange={(value) =>
                setValue("consent_marketing", value === true)
              }
            />
            <Label
              htmlFor="profile-contact-consent"
              className="text-xs font-normal leading-relaxed text-muted-foreground"
            >
              I agree to be added to the broker&apos;s contact list and receive
              relevant listings by email. I can opt out at any time.
            </Label>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send message
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
