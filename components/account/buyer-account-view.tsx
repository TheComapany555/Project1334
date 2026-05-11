"use client";

import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { motion, type Variants } from "framer-motion";
import { toast } from "sonner";
import {
  Camera,
  Check,
  Heart,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  Trash2,
  Loader2,
  Mail,
  CalendarClock,
  ArrowRight,
  GitCompareArrows,
  KeyRound,
  LogOut,
  Pencil,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LogoutConfirmDialog } from "@/components/logout-confirm-dialog";
import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  removeBuyerPhoto,
  updateBuyerAccount,
  uploadBuyerPhoto,
  type BuyerAccount,
} from "@/lib/actions/buyer-account";
import { BuyerPreferencesCard } from "@/components/account/buyer-preferences-card";

type Props = {
  account: BuyerAccount;
};

export function BuyerAccountView({ account }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const variants: Variants = reducedMotion
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.22, ease: "easeOut" },
        },
      };
  const containerVariants: Variants = reducedMotion
    ? {}
    : { visible: { transition: { staggerChildren: 0.06 } } };

  const handleProfileSaved = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <TooltipProvider delayDuration={150}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <motion.div variants={variants}>
          <PageHeader name={account.name} email={account.email} />
        </motion.div>

        <motion.div variants={variants}>
          <ProfileCard account={account} onSaved={handleProfileSaved} />
        </motion.div>

        <motion.div variants={variants}>
          <BuyerPreferencesCard preferences={account.preferences} />
        </motion.div>

        <motion.div variants={variants}>
          <ActivityCard stats={account.stats} />
        </motion.div>

        <motion.div variants={variants}>
          <SecurityCard
            email={account.email}
            verified={!!account.email_verified_at}
            onLogout={() => setLogoutOpen(true)}
          />
        </motion.div>
      </motion.div>

      <LogoutConfirmDialog
        open={logoutOpen}
        onOpenChange={setLogoutOpen}
        onConfirm={() => signOut({ callbackUrl: "/" })}
      />
    </TooltipProvider>
  );
}

// ─── Page header ───────────────────────────────────────────────────────────

function PageHeader({ name, email }: { name: string | null; email: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Your account
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Welcome back{name ? `, ${name.split(/\s+/)[0]}` : ""}. Manage your
        profile, view activity, and update your sign-in details.{" "}
        <span className="text-foreground/70">{email}</span>
      </p>
    </div>
  );
}

// ─── Profile card ──────────────────────────────────────────────────────────

function ProfileCard({
  account,
  onSaved,
}: {
  account: BuyerAccount;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(account.name ?? "");
  const [phone, setPhone] = useState(account.phone ?? "");
  const [photoUrl, setPhotoUrl] = useState(account.photo_url);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [removePhotoOpen, setRemovePhotoOpen] = useState(false);
  const [, startSaveTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = useMemo(
    () => getInitials(name || account.name, account.email),
    [name, account.name, account.email],
  );

  const memberSince = account.created_at
    ? new Date(account.created_at).toLocaleDateString("en-AU", {
        month: "long",
        year: "numeric",
      })
    : null;

  const dirty =
    (name.trim() !== (account.name ?? "")) ||
    (phone.trim() !== (account.phone ?? ""));

  function handleCancel() {
    setName(account.name ?? "");
    setPhone(account.phone ?? "");
    setEditing(false);
  }

  const handleSave = useCallback(() => {
    if (!dirty) {
      setEditing(false);
      return;
    }
    startSaveTransition(async () => {
      const res = await updateBuyerAccount({
        name: name.trim(),
        phone: phone.trim() || null,
      });
      if (res.ok) {
        toast.success("Profile updated.");
        setEditing(false);
        onSaved();
      } else {
        toast.error(res.error ?? "Couldn't update profile.");
      }
    });
  }, [name, phone, dirty, onSaved]);

  const handlePhotoSelect = useCallback(
    async (file: File) => {
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo must be under 5MB.");
        return;
      }
      setPhotoUploading(true);
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadBuyerPhoto(fd);
      setPhotoUploading(false);
      if (res.ok && res.url) {
        setPhotoUrl(res.url);
        toast.success("Photo updated.");
        onSaved();
      } else {
        toast.error(res.error ?? "Couldn't upload photo.");
      }
    },
    [onSaved],
  );

  const handlePhotoRemove = useCallback(() => {
    startSaveTransition(async () => {
      const res = await removeBuyerPhoto();
      if (res.ok) {
        setPhotoUrl(null);
        setRemovePhotoOpen(false);
        toast.success("Photo removed.");
        onSaved();
      } else {
        toast.error(res.error ?? "Couldn't remove photo.");
      }
    });
  }, [onSaved]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            Your name and contact info appear on enquiries you send.
          </CardDescription>
        </div>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="gap-1.5 cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
            Edit
          </Button>
        )}
      </CardHeader>
      <Separator />
      <CardContent className="pt-5 space-y-6">
        {/* Photo + identity */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar className="h-20 w-20 ring-2 ring-border shadow-sm">
              {photoUrl ? (
                <AvatarImage src={photoUrl} alt={name || account.email} />
              ) : null}
              <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoUploading}
                  aria-label="Change photo"
                  className={cn(
                    "absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full",
                    "bg-primary text-primary-foreground shadow-md ring-2 ring-background",
                    "hover:bg-primary/90 transition-colors cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-70",
                  )}
                >
                  {photoUploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Camera className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Change photo</TooltipContent>
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoSelect(file);
                e.target.value = "";
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold truncate">
              {name.trim() || account.name || "Your name"}
            </p>
            <div className="mt-0.5 flex flex-col gap-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 truncate">
                <Mail className="h-3 w-3 shrink-0" aria-hidden />
                {account.email}
              </span>
              {memberSince && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3 w-3 shrink-0" aria-hidden />
                  Member since {memberSince}
                </span>
              )}
            </div>
            {photoUrl && (
              <button
                type="button"
                onClick={() => setRemovePhotoOpen(true)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                <Trash2 className="h-3 w-3" aria-hidden />
                Remove photo
              </button>
            )}
          </div>
        </div>

        <Separator />

        {/* Editable fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldBlock
            id="account-name"
            label="Full name"
            editing={editing}
            value={name}
            displayValue={account.name?.trim() || "Not set"}
            onChange={setName}
            placeholder="e.g. Alex Smith"
            icon={null}
          />
          <FieldBlock
            id="account-phone"
            label="Phone"
            editing={editing}
            value={phone}
            displayValue={account.phone?.trim() || "Not set"}
            onChange={setPhone}
            placeholder="04XX XXX XXX"
            type="tel"
            inputMode="tel"
          />
          <FieldBlock
            id="account-email"
            label="Email"
            editing={false}
            value={account.email}
            displayValue={account.email}
            onChange={() => {}}
            placeholder=""
            disabled
            help="Email is your sign-in. Contact support to change it."
          />
        </div>

        {editing && (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              className="cursor-pointer"
            >
              <X className="h-4 w-4 mr-1.5" aria-hidden />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!dirty}
              className="cursor-pointer"
            >
              <Check className="h-4 w-4 mr-1.5" aria-hidden />
              Save changes
            </Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={removePhotoOpen} onOpenChange={setRemovePhotoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove your photo?</AlertDialogTitle>
            <AlertDialogDescription>
              We&apos;ll show your initials in place of your photo. You can upload a
              new one anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePhotoRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ─── Field block (read-mode + edit-mode in one) ───────────────────────────

function FieldBlock({
  id,
  label,
  value,
  displayValue,
  editing,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  disabled = false,
  help,
  icon,
}: {
  id: string;
  label: string;
  value: string;
  displayValue: string;
  editing: boolean;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  inputMode?: "text" | "tel" | "email" | "url" | "numeric" | "decimal" | "search" | "none";
  disabled?: boolean;
  help?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {editing && !disabled ? (
        <Input
          id={id}
          type={type}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={inputModeToAutocomplete(type)}
        />
      ) : (
        <div className="flex items-center gap-2 min-h-[36px] text-sm">
          {icon}
          <span
            className={cn(
              "truncate",
              displayValue === "Not set"
                ? "text-muted-foreground italic"
                : "text-foreground",
            )}
          >
            {displayValue}
          </span>
        </div>
      )}
      {help && (
        <p className="text-[11px] text-muted-foreground">{help}</p>
      )}
    </div>
  );
}

function inputModeToAutocomplete(type: string): string | undefined {
  if (type === "email") return "email";
  if (type === "tel") return "tel";
  return "off";
}

// ─── Activity card ────────────────────────────────────────────────────────

const ActivityCard = memo(function ActivityCard({
  stats,
}: {
  stats: BuyerAccount["stats"];
}) {
  const items: { icon: React.ReactNode; label: string; value: number; href: string; cta: string; accent: string; description: string }[] = [
    {
      icon: <Heart className="h-4 w-4" />,
      label: "Saved listings",
      value: stats.saved_listings,
      href: "/saved",
      cta: "View saved",
      accent: "#ec4899",
      description: "Listings you've bookmarked.",
    },
    {
      icon: <MessageSquare className="h-4 w-4" />,
      label: "Enquiries sent",
      value: stats.enquiries,
      href: "/search",
      cta: "Browse listings",
      accent: "#f59e0b",
      description: "Times you've contacted a broker.",
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "NDAs signed",
      value: stats.nda_signed,
      href: "/saved",
      cta: "View access",
      accent: "#8b5cf6",
      description: "Listings you've unlocked with an NDA.",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Activity</CardTitle>
        <CardDescription>
          A snapshot of your activity across Salebiz.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {items.map((item) => (
            <Card
              key={item.label}
              className="overflow-hidden border-border/60 transition-shadow duration-200 hover:shadow-md"
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-md"
                    style={{
                      background: `${item.accent}18`,
                      color: item.accent,
                    }}
                    aria-hidden
                  >
                    {item.icon}
                  </div>
                  <span className="text-2xl font-bold tabular-nums leading-none">
                    {item.value.toLocaleString("en-AU")}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {item.description}
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs gap-1 cursor-pointer"
                >
                  <Link href={item.href}>
                    {item.cta}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator className="my-5" />

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/saved">
              <Heart className="h-3.5 w-3.5" aria-hidden />
              Saved listings
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/compare">
              <GitCompareArrows className="h-3.5 w-3.5" aria-hidden />
              Compare
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/search">
              Browse listings
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

// ─── Security card ────────────────────────────────────────────────────────

function SecurityCard({
  email,
  verified,
  onLogout,
}: {
  email: string;
  verified: boolean;
  onLogout: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sign-in &amp; security</CardTitle>
        <CardDescription>
          Manage how you sign in to Salebiz.
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md shrink-0",
                verified
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
              )}
              aria-hidden
            >
              {verified ? (
                <ShieldCheck className="h-4 w-4" />
              ) : (
                <ShieldAlert className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{email}</p>
              <p className="text-xs text-muted-foreground">
                {verified ? "Email verified" : "Email not yet verified"}
              </p>
            </div>
          </div>
          {!verified && (
            <Button asChild variant="outline" size="sm">
              <Link href="/auth/verify">Verify email</Link>
            </Button>
          )}
        </div>

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground shrink-0"
              aria-hidden
            >
              <KeyRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">
                Reset your password by email if you&apos;ve forgotten it.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/auth/reset">Reset password</Link>
          </Button>
        </div>

        <Separator />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-md bg-destructive/10 text-destructive shrink-0"
              aria-hidden
            >
              <LogOut className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Sign out</p>
              <p className="text-xs text-muted-foreground">
                End your session on this browser.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={onLogout}
            className="cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" aria-hidden />
            Sign out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loading skeleton (currently unused but exported for future use) ───────

export function BuyerAccountSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-md" />
          <Skeleton className="h-24 rounded-md" />
          <Skeleton className="h-24 rounded-md" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string | null): string {
  const source = (name ?? email ?? "").trim();
  if (!source) return "?";
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
    return (
      ((parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")).toUpperCase() || "?"
    );
  }
  return source[0]?.toUpperCase() ?? "?";
}
