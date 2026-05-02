"use client";

import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldError } from "@/components/ui/field-error";
import { submitEnquiry } from "@/lib/actions/enquiries";
import { Loader2, CheckCircle2, Send, Mail, User, Phone, PhoneCall, Target } from "lucide-react";

const REASON_OPTIONS = [
  { value: "general", label: "General enquiry" },
  { value: "request_viewing", label: "Request viewing" },
  { value: "make_offer", label: "Make an offer" },
  { value: "request_callback", label: "Request call back" },
  { value: "other", label: "Other" },
] as const;

const enquirySchema = z.object({
  reason: z.string(),
  message: z.string().min(10, "Message must be at least 10 characters"),
  contact_name: z.string(),
  contact_email: z.string().email("Enter a valid email address"),
  contact_phone: z.string(),
  interest: z.string(),
  consent_marketing: z.boolean(),
});

type FormData = z.infer<typeof enquirySchema>;

type Props = {
  listingId: string;
  listingTitle?: string;
  /** Pre-fill values for logged-in buyers (autofill from session + profile). */
  defaults?: {
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
  };
};

export function EnquiryForm({ listingId, listingTitle, defaults }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [callbackMode, setCallbackMode] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      reason: "",
      message: "",
      contact_name: defaults?.contact_name?.trim() || "",
      contact_email: defaults?.contact_email?.trim() || "",
      contact_phone: defaults?.contact_phone?.trim() || "",
      interest: "",
      consent_marketing: false,
    },
  });

  const reason = watch("reason");
  const consentMarketing = watch("consent_marketing");

  function handleRequestCallback() {
    setCallbackMode(true);
    setValue("reason", "request_callback");
    setValue(
      "message",
      `I'd like to request a call back regarding "${listingTitle || "this listing"}". Please contact me at your earliest convenience.`
    );
    setTimeout(() => {
      document.getElementById("enquiry-form-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

  async function onSubmit(data: FormData) {
    // Validate callback-specific required fields
    if (callbackMode) {
      let hasError = false;
      if (!data.contact_name?.trim()) {
        setError("contact_name", { message: "Name is required for call back requests" });
        hasError = true;
      }
      if (!data.contact_phone?.trim()) {
        setError("contact_phone", { message: "Phone is required for call back requests" });
        hasError = true;
      }
      if (hasError) return;
    }

    const formData = new FormData();
    formData.set("message", data.message);
    formData.set("contact_email", data.contact_email);
    if (data.contact_name) formData.set("contact_name", data.contact_name);
    if (data.contact_phone) formData.set("contact_phone", data.contact_phone);
    if (data.reason) formData.set("reason", data.reason);
    if (data.interest) formData.set("interest", data.interest);
    formData.set("consent_marketing", data.consent_marketing ? "true" : "false");

    const result = await submitEnquiry(listingId, formData);
    if (result.ok) {
      setSubmitted(true);
      reset();
      toast.success(
        callbackMode
          ? "Call back request sent. The broker will contact you soon."
          : "Enquiry sent. The broker will contact you soon."
      );
    } else {
      toast.error(result.error ?? "Failed to send.");
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle>
            {callbackMode ? "Call back requested" : "Enquiry sent"}
          </CardTitle>
          <CardDescription className="leading-relaxed">
            Thanks for your interest. The broker will contact you using the details you provided.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSubmitted(false);
              setCallbackMode(false);
            }}
          >
            Send another enquiry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Request Call Back button */}
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex flex-col sm:flex-row items-center gap-3 py-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <PhoneCall className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-medium text-foreground">
              Want to discuss this listing?
            </p>
            <p className="text-xs text-muted-foreground">
              Request a call back and the broker will get in touch
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleRequestCallback}
            className="gap-1.5 shrink-0"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            Request call back
          </Button>
        </CardContent>
      </Card>

      {/* Enquiry form */}
      <Card id="enquiry-form-card">
        <CardHeader>
          <CardTitle>
            {callbackMode ? "Request a call back" : "Send an enquiry"}
          </CardTitle>
          <CardDescription>
            {callbackMode
              ? "Leave your details and the broker will call you back."
              : "Contact the broker about this listing. Your details will not be shared elsewhere."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="enquiry-reason">Reason (optional)</Label>
              <Select
                value={reason}
                onValueChange={(v) => {
                  setValue("reason", v);
                  setCallbackMode(v === "request_callback");
                }}
              >
                <SelectTrigger id="enquiry-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="enquiry-message">Message *</Label>
              <Textarea
                id="enquiry-message"
                placeholder={
                  callbackMode
                    ? "Any specific topics you'd like to discuss on the call..."
                    : "Tell the broker what you'd like to know or arrange..."
                }
                rows={4}
                className={`resize-none ${errors.message ? "border-destructive focus-visible:ring-destructive" : ""}`}
                {...register("message")}
              />
              <FieldError message={errors.message?.message} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="enquiry-name">
                  Your name {callbackMode ? "*" : "(optional)"}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="enquiry-name"
                    type="text"
                    placeholder="Name"
                    className={`pl-9 ${errors.contact_name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    {...register("contact_name")}
                  />
                </div>
                <FieldError message={errors.contact_name?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enquiry-email">Your email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="enquiry-email"
                    type="email"
                    placeholder="you@example.com"
                    className={`pl-9 ${errors.contact_email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    {...register("contact_email")}
                  />
                </div>
                <FieldError message={errors.contact_email?.message} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="enquiry-phone">
                Phone {callbackMode ? "*" : "(optional)"}
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="enquiry-phone"
                  type="tel"
                  placeholder="Phone number"
                  className={`pl-9 ${errors.contact_phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  {...register("contact_phone")}
                />
              </div>
              <FieldError message={errors.contact_phone?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="enquiry-interest">
                What are you looking for? (optional)
              </Label>
              <div className="relative">
                <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="enquiry-interest"
                  type="text"
                  placeholder="e.g. Cafe in Sydney under $500k"
                  className="pl-9"
                  {...register("interest")}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Helps the broker match you with similar listings.
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
              <Checkbox
                id="enquiry-consent"
                checked={consentMarketing}
                onCheckedChange={(v) => setValue("consent_marketing", v === true)}
              />
              <Label
                htmlFor="enquiry-consent"
                className="text-xs font-normal leading-relaxed text-muted-foreground"
              >
                I agree to be added to the broker&apos;s contact list and receive
                relevant listings by email. You can opt out at any time.
              </Label>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : callbackMode ? (
                <>
                  <PhoneCall className="h-4 w-4" />
                  Request call back
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send enquiry
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
