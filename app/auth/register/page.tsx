"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ReCAPTCHA from "react-google-recaptcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { register as registerAction, registerBuyer } from "@/lib/actions/auth";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";

// ── Schemas ──

const brokerSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    company: z.string().min(1, "Agency name is required").max(200),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Must be at least 8 characters long."),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

const buyerSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Must be at least 8 characters long."),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type BrokerFormData = z.infer<typeof brokerSchema>;
type BuyerFormData = z.infer<typeof buyerSchema>;

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "buyer" ? "buyer" : "broker";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [success, setSuccess] = useState(false);

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          We sent a verification link to your email. Click it to verify your
          account, then sign in.
        </p>
        <Button asChild className="w-full">
          <Link href={`/auth/login?tab=${activeTab}`}>
            Go to sign in
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Choose your account type to get started
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="buyer" className="flex-1">
            Buyer
          </TabsTrigger>
          <TabsTrigger value="broker" className="flex-1">
            Broker / Agency
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buyer">
          <BuyerRegisterForm onSuccess={() => setSuccess(true)} />
        </TabsContent>

        <TabsContent value="broker">
          <BrokerRegisterForm onSuccess={() => setSuccess(true)} />
        </TabsContent>
      </Tabs>

      <div className="text-center text-sm">
        Already have an account?{" "}
        <Link
          href={`/auth/login?tab=${activeTab}`}
          className="underline underline-offset-4 hover:text-primary"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

// ── Buyer Form ──

function BuyerRegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BuyerFormData>({ resolver: zodResolver(buyerSchema) });

  async function onSubmit(data: BuyerFormData) {
    setError(null);
    const captchaToken = recaptchaRef.current?.getValue();
    if (!captchaToken) {
      setError("Please complete the CAPTCHA.");
      toast.error("Please complete the CAPTCHA.");
      return;
    }
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    formData.set("name", data.name);
    formData.set("captchaToken", captchaToken);
    const result = await registerBuyer(formData);
    recaptchaRef.current?.reset();
    if (result.ok) {
      onSuccess();
      toast.success("Account created. Check your email to verify.");
      return;
    }
    setError(result.error);
    toast.error(result.error);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground text-center">
        Save listings, compare businesses, sign NDAs, and access documents.
      </p>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="buyer-name">Full name</Label>
          <Input
            id="buyer-name"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            className={errors.name ? "border-destructive" : ""}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="buyer-email">Email</Label>
          <Input
            id="buyer-email"
            type="email"
            autoComplete="email"
            placeholder="m@example.com"
            className={errors.email ? "border-destructive" : ""}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="buyer-password">Password</Label>
            <Input
              id="buyer-password"
              type="password"
              autoComplete="new-password"
              className={errors.password ? "border-destructive" : ""}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="buyer-confirm">Confirm</Label>
            <Input
              id="buyer-confirm"
              type="password"
              autoComplete="new-password"
              className={errors.confirm ? "border-destructive" : ""}
              {...register("confirm")}
            />
            {errors.confirm && (
              <p className="text-xs text-destructive">
                {errors.confirm.message}
              </p>
            )}
          </div>
        </div>

        {!errors.password && (
          <p className="text-xs text-muted-foreground -mt-2">
            Must be at least 8 characters long.
          </p>
        )}

        {RECAPTCHA_SITE_KEY && (
          <div
            className="w-full"
            style={{ transform: "scaleX(1.22)", transformOrigin: "0 0" }}
          >
            <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create Buyer Account"
          )}
        </Button>
      </form>
    </div>
  );
}

// ── Broker Form ──

function BrokerRegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BrokerFormData>({ resolver: zodResolver(brokerSchema) });

  async function onSubmit(data: BrokerFormData) {
    setError(null);
    const captchaToken = recaptchaRef.current?.getValue();
    if (!captchaToken) {
      setError("Please complete the CAPTCHA.");
      toast.error("Please complete the CAPTCHA.");
      return;
    }
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    formData.set("name", data.name);
    formData.set("company", data.company);
    formData.set("captchaToken", captchaToken);
    const result = await registerAction(formData);
    recaptchaRef.current?.reset();
    if (result.ok) {
      onSuccess();
      toast.success("Account created. Check your email to verify.");
      return;
    }
    setError(result.error);
    toast.error(result.error);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground text-center">
        List businesses for sale, manage enquiries, and grow your agency.
      </p>

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="broker-email">Email</Label>
          <Input
            id="broker-email"
            type="email"
            autoComplete="email"
            placeholder="m@example.com"
            className={errors.email ? "border-destructive" : ""}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="broker-name">Full name</Label>
          <Input
            id="broker-name"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            className={errors.name ? "border-destructive" : ""}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="broker-company">Agency name</Label>
          <Input
            id="broker-company"
            type="text"
            autoComplete="organization"
            placeholder="Your agency or company"
            className={errors.company ? "border-destructive" : ""}
            {...register("company")}
          />
          {errors.company && (
            <p className="text-xs text-destructive">
              {errors.company.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="broker-password">Password</Label>
            <Input
              id="broker-password"
              type="password"
              autoComplete="new-password"
              className={errors.password ? "border-destructive" : ""}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="broker-confirm">Confirm</Label>
            <Input
              id="broker-confirm"
              type="password"
              autoComplete="new-password"
              className={errors.confirm ? "border-destructive" : ""}
              {...register("confirm")}
            />
            {errors.confirm && (
              <p className="text-xs text-destructive">
                {errors.confirm.message}
              </p>
            )}
          </div>
        </div>

        {!errors.password && (
          <p className="text-xs text-muted-foreground -mt-2">
            Must be at least 8 characters long.
          </p>
        )}

        {RECAPTCHA_SITE_KEY && (
          <div
            className="w-full"
            style={{ transform: "scaleX(1.22)", transformOrigin: "0 0" }}
          >
            <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            "Create Agency Account"
          )}
        </Button>
      </form>
    </div>
  );
}
