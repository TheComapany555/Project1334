"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  ShieldCheck,
  Mail,
  AlertCircle,
  Loader2,
  Check,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignaturePad } from "@/components/listings/signature-pad";
import {
  acceptShareInvite,
  signInviteNdaForExistingUser,
} from "@/lib/actions/share-invites";
import type { InvitePublicData } from "@/lib/types/share-invites";

type Props = {
  invite: InvitePublicData;
  isLoggedIn: boolean;
  loggedInEmail: string | null;
};

function formatPrice(asking: number | null, type: string): string {
  if (type === "poa") return "Price on application";
  if (asking != null) {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(Number(asking));
  }
  return "Price on request";
}

function getInitials(name: string | null, email: string): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.charAt(0).toUpperCase();
}

export function InviteLandingView({ invite, isLoggedIn, loggedInEmail }: Props) {
  const router = useRouter();
  const [pending, startSubmit] = useTransition();

  const [fullName, setFullName] = useState(invite.recipientName ?? "");
  const [password, setPassword] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wrongAccount = isLoggedIn && loggedInEmail !== invite.recipientEmail;
  const sameAccount = isLoggedIn && loggedInEmail === invite.recipientEmail;
  const accountAlreadyExistsForEmail = !!invite.alreadyAccountUserId && !sameAccount;

  const price = formatPrice(invite.listing.asking_price, invite.listing.price_type);
  const brokerLabel = invite.broker.name || "The broker";

  // ── Mode A: visitor is logged in as the same user ──
  // They just need to sign the NDA (if required) to proceed.
  function handleSignAsExisting() {
    setError(null);
    if (invite.ndaRequired && !signatureData) {
      setError("Please sign the NDA to continue.");
      return;
    }
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    startSubmit(async () => {
      const res = await signInviteNdaForExistingUser(
        invite.token,
        signatureData ?? "",
        fullName
      );
      if (!res.ok) {
        setError(res.error ?? "Failed to sign NDA.");
        return;
      }
      router.push(`/listing/${res.listingSlug ?? invite.listing.slug}`);
    });
  }

  // ── Mode B: brand new visitor — create account + sign NDA ──
  function handleAcceptAndCreate() {
    setError(null);
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (invite.ndaRequired && !signatureData) {
      setError("Please sign the NDA to continue.");
      return;
    }
    startSubmit(async () => {
      const res = await acceptShareInvite(invite.token, {
        fullName,
        password,
        signatureData: signatureData ?? undefined,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Auto sign in then redirect to the listing
      const signInResult = await signIn("credentials", {
        email: res.email,
        password,
        redirect: false,
      });
      if (signInResult?.error) {
        // Account was created but sign-in failed — send to login with callback
        router.push(
          `/auth/login?email=${encodeURIComponent(res.email)}&callbackUrl=${encodeURIComponent(`/listing/${res.listingSlug}`)}`
        );
        return;
      }
      router.push(`/listing/${res.listingSlug}`);
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          You&apos;ve been invited
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          {brokerLabel} shared a listing with you
        </h1>
      </div>

      {/* Broker card */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <Avatar className="h-14 w-14 shrink-0">
            {invite.broker.photoUrl && (
              <AvatarImage src={invite.broker.photoUrl} alt={brokerLabel} />
            )}
            <AvatarFallback className="text-base bg-primary/10 text-primary font-semibold">
              {getInitials(invite.broker.name, invite.recipientEmail)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{brokerLabel}</p>
            {invite.broker.company && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                <Building2 className="h-3.5 w-3.5" />
                {invite.broker.company}
              </p>
            )}
            {invite.broker.slug && (
              <Link
                href={`/broker/${encodeURIComponent(invite.broker.slug)}`}
                className="text-xs text-primary hover:underline"
              >
                View broker profile
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personal note */}
      {invite.customMessage && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="py-4 space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
              Personal note from {brokerLabel}
            </p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {invite.customMessage}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Listing teaser */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{invite.listing.title}</CardTitle>
          <CardDescription className="space-x-2">
            <span>{price}</span>
            {invite.listing.location_text && (
              <>
                <span aria-hidden="true">·</span>
                <span>{invite.listing.location_text}</span>
              </>
            )}
          </CardDescription>
        </CardHeader>
        {invite.listing.summary && (
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-4">
              {invite.listing.summary}
            </p>
          </CardContent>
        )}
      </Card>

      {/* Action panel */}
      {wrongAccount ? (
        <SwitchAccountPanel
          invitedEmail={invite.recipientEmail}
          loggedInEmail={loggedInEmail!}
          token={invite.token}
        />
      ) : sameAccount ? (
        <SignNdaPanel
          ndaRequired={invite.ndaRequired}
          ndaText={invite.ndaText}
          ndaAlreadySigned={invite.ndaAlreadySigned}
          fullName={fullName}
          setFullName={setFullName}
          setSignatureData={setSignatureData}
          onSubmit={handleSignAsExisting}
          pending={pending}
          error={error}
          listingSlug={invite.listing.slug}
        />
      ) : accountAlreadyExistsForEmail ? (
        <ExistingAccountPanel
          email={invite.recipientEmail}
          token={invite.token}
        />
      ) : (
        <CreateAccountPanel
          email={invite.recipientEmail}
          fullName={fullName}
          setFullName={setFullName}
          password={password}
          setPassword={setPassword}
          setSignatureData={setSignatureData}
          ndaRequired={invite.ndaRequired}
          ndaText={invite.ndaText}
          onSubmit={handleAcceptAndCreate}
          pending={pending}
          error={error}
        />
      )}
    </div>
  );
}

/* ───────────────────────────── Sub-panels ────────────────────────────── */

function SwitchAccountPanel({
  invitedEmail,
  loggedInEmail,
  token,
}: {
  invitedEmail: string;
  loggedInEmail: string;
  token: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          Wrong account
        </CardTitle>
        <CardDescription>
          This invite was sent to{" "}
          <span className="font-medium text-foreground">{invitedEmail}</span>,
          but you are signed in as{" "}
          <span className="font-medium text-foreground">{loggedInEmail}</span>.
          Sign out first to use this invite.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button variant="outline" asChild>
          <Link
            href={`/api/auth/signout?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
          >
            Sign out and continue
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ExistingAccountPanel({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Sign in to continue
        </CardTitle>
        <CardDescription>
          An account already exists for{" "}
          <span className="font-medium text-foreground">{email}</span>. Sign in
          to claim this invite and view the listing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link
            href={`/auth/login?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(`/invite/${token}`)}`}
          >
            Sign in
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function SignNdaPanel({
  ndaRequired,
  ndaText,
  ndaAlreadySigned,
  fullName,
  setFullName,
  setSignatureData,
  onSubmit,
  pending,
  error,
  listingSlug,
}: {
  ndaRequired: boolean;
  ndaText: string | null;
  ndaAlreadySigned: boolean;
  fullName: string;
  setFullName: (v: string) => void;
  setSignatureData: (v: string | null) => void;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
  listingSlug: string;
}) {
  if (!ndaRequired || ndaAlreadySigned) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            You&apos;re ready to view this listing
          </CardTitle>
          <CardDescription>
            {ndaAlreadySigned
              ? "You have already signed the NDA for this listing."
              : "No NDA is required for this listing."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={`/listing/${listingSlug}`}>Open listing</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Sign the NDA to continue
        </CardTitle>
        <CardDescription>
          The broker requires confidentiality before sharing the full details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ndaText && (
          <div className="rounded-md border bg-muted/30 p-4 max-h-60 overflow-y-auto text-sm whitespace-pre-wrap leading-relaxed">
            {ndaText}
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="signer-name">Full name *</Label>
          <Input
            id="signer-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Smith"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Signature *</Label>
          <SignaturePad onSignatureChange={setSignatureData} />
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        <Button onClick={onSubmit} disabled={pending} className="w-full gap-2">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Sign NDA and view listing
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function CreateAccountPanel({
  email,
  fullName,
  setFullName,
  password,
  setPassword,
  setSignatureData,
  ndaRequired,
  ndaText,
  onSubmit,
  pending,
  error,
}: {
  email: string;
  fullName: string;
  setFullName: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  setSignatureData: (v: string | null) => void;
  ndaRequired: boolean;
  ndaText: string | null;
  onSubmit: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create your buyer account</CardTitle>
        <CardDescription>
          {ndaRequired
            ? "Sign the NDA and create a free account to view the full listing."
            : "Create a free buyer account to view the full listing."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Full name *</Label>
            <Input
              id="invite-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Smith"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              value={email}
              disabled
              className="bg-muted/30"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-password">Choose a password *</Label>
          <Input
            id="invite-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        </div>

        {ndaRequired && (
          <div className="space-y-3 rounded-md border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">
                Non-disclosure agreement
              </p>
            </div>
            {ndaText && (
              <div className="rounded-md border bg-background p-3 max-h-48 overflow-y-auto text-xs whitespace-pre-wrap leading-relaxed">
                {ndaText}
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Signature *</Label>
              <SignaturePad onSignatureChange={setSignatureData} height={120} />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <Button onClick={onSubmit} disabled={pending} className="w-full gap-2">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              {ndaRequired ? "Sign and create account" : "Create account"}
            </>
          )}
        </Button>

        <p className="text-[11px] text-muted-foreground text-center">
          By creating an account, you agree to Salebiz&apos;s Terms of Service
          and Privacy Policy. You can opt out of broker communications at any
          time.
        </p>
      </CardContent>
    </Card>
  );
}
