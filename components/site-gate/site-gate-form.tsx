"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SALEBIZ_LOGO_URL } from "@/lib/branding";

export function SiteGateForm() {
  const [password, setPassword] = useState("");
  const [isSubmitting, startSubmit] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = password.trim();
    if (!value) {
      toast.error("Please enter the password.");
      return;
    }
    startSubmit(async () => {
      try {
        const res = await fetch("/api/site-gate/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: value }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };
        if (res.ok && data.ok) {
          // Cookie is set — reload the originally requested page; the gate now
          // lets the request through.
          window.location.reload();
          return;
        }
        toast.error(data.error ?? "Incorrect password. Please try again.");
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <div className="grid w-full max-w-md gap-6 rounded-xl bg-background p-6 text-sm ring-1 ring-foreground/10 shadow-xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <Image
            src={SALEBIZ_LOGO_URL}
            alt="Salebiz"
            width={120}
            height={36}
            className="h-7 w-auto object-contain"
            priority
          />
          <div className="flex size-11 items-center justify-center rounded-full bg-primary/10">
            <Lock className="size-5 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-base font-semibold">This site is private</h1>
            <p className="text-muted-foreground">
              Salebiz isn&apos;t public yet. Enter the access password to
              continue.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-1.5 text-left">
            <Label htmlFor="site-gate-password">Password</Label>
            <Input
              id="site-gate-password"
              type="password"
              autoFocus
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={isSubmitting}
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Enter site
          </Button>
        </form>
      </div>
    </div>
  );
}
