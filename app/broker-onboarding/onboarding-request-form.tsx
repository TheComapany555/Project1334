"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthField } from "@/components/auth/auth-field";
import { AuthError } from "@/components/auth/auth-shell";
import { submitOnboardingRequest } from "@/lib/actions/broker-onboarding";
import { LISTING_COUNT_OPTIONS } from "@/lib/types/onboarding";
import { CheckCircle2, Loader2 } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Enter your name").max(100),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().max(40, "Phone number is too long").optional(),
  agencyName: z.string().max(200, "Agency name is too long").optional(),
  listingCount: z.string().optional(),
  message: z
    .string()
    .max(2000, "Please keep this under 2000 characters")
    .optional(),
});

type FormData = z.infer<typeof schema>;

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

export function OnboardingRequestForm() {
  const [submitted, setSubmitted] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listingCount, setListingCount] = useState<string>("");
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);

    const captchaToken = recaptchaRef.current?.getValue();
    if (RECAPTCHA_SITE_KEY && !captchaToken) {
      const message = "Confirm you're not a robot to continue.";
      setError(message);
      toast.error(message);
      return;
    }

    const result = await submitOnboardingRequest({
      ...data,
      listingCount: listingCount || undefined,
      captchaToken,
    });
    recaptchaRef.current?.reset();

    if (result.ok) {
      setSubmitted(result.requestNo);
      toast.success("Request sent. We'll be in touch within one business day.");
      return;
    }
    setError(result.error);
    toast.error(result.error);
  }

  if (submitted !== null) {
    return (
      <div className="border-border bg-card rounded-2xl border p-7 shadow-sm">
        <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
          <CheckCircle2 className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="text-foreground mt-5 text-xl font-semibold tracking-[-0.01em]">
          Request sent
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Your reference is{" "}
          <span className="text-foreground font-medium tabular-nums">
            #{submitted}
          </span>
          . We&apos;ve emailed you a confirmation, and one of our team will be in
          touch within one business day. Nothing else to do for now.
        </p>
        <Button asChild variant="outline" className="mt-6 h-11 w-full">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="border-border bg-card rounded-2xl border p-7 shadow-sm">
      <h2 className="text-foreground text-xl font-semibold tracking-[-0.01em]">
        Ask us to set it up
      </h2>
      <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
        No obligation, and no payment details needed to talk to us.
      </p>

      {error && (
        <div className="mt-5">
          <AuthError>{error}</AuthError>
        </div>
      )}

      <form
        onSubmit={(event) => {
          void handleSubmit(onSubmit)(event);
        }}
        className="mt-6 grid gap-5"
        noValidate
      >
        <AuthField
          label="Your name"
          id="onboarding-name"
          type="text"
          autoComplete="name"
          placeholder="Jane Smith"
          error={errors.name?.message}
          {...register("name")}
        />

        <AuthField
          label="Email"
          id="onboarding-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <AuthField
          label="Phone"
          id="onboarding-phone"
          type="tel"
          autoComplete="tel"
          placeholder="04xx xxx xxx"
          hint="Optional — fastest way for us to reach you."
          error={errors.phone?.message}
          {...register("phone")}
        />

        <AuthField
          label="Agency or company"
          id="onboarding-agency"
          type="text"
          autoComplete="organization"
          placeholder="Your agency name"
          error={errors.agencyName?.message}
          {...register("agencyName")}
        />

        <div className="grid gap-2">
          <Label htmlFor="onboarding-listings">
            How many businesses are you listing?
          </Label>
          <Select value={listingCount} onValueChange={setListingCount}>
            <SelectTrigger id="onboarding-listings" className="h-11 w-full">
              <SelectValue placeholder="Select a range" />
            </SelectTrigger>
            <SelectContent>
              {LISTING_COUNT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="onboarding-message">
            Anything we should know?
          </Label>
          <Textarea
            id="onboarding-message"
            rows={4}
            placeholder="Where your listings live now, deadlines, anything unusual about your setup…"
            aria-invalid={errors.message ? true : undefined}
            {...register("message")}
          />
          {errors.message && (
            <p role="alert" className="text-destructive text-xs">
              {errors.message.message}
            </p>
          )}
        </div>

        {RECAPTCHA_SITE_KEY && (
          <div className="flex justify-center">
            <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} />
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full cursor-pointer"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            "Request managed onboarding"
          )}
        </Button>

        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          We&apos;ll only use these details to contact you about setting up your
          agency. See our{" "}
          <Link
            href="/privacy"
            className="hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </div>
  );
}
