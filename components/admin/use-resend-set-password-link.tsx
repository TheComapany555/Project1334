"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Check, ExternalLink } from "lucide-react";
import { resendSetPasswordLinkByAdmin } from "@/lib/actions/admin-account-creation";

/**
 * Shared admin control for re-issuing a broker's set-password link.
 *
 * Returns `resend(userId)` to trigger it, a `pending` flag for the trigger UI,
 * and a `dialog` node to render once. After a successful resend the dialog
 * shows the link so the admin can copy it (to send manually when email is
 * flaky) or open it directly to set the broker's password.
 */
export function useResendSetPasswordLink() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);

  async function resend(userId: string | null | undefined) {
    if (!userId || pending) return;
    setPending(true);
    const res = await resendSetPasswordLinkByAdmin(userId);
    setPending(false);
    if (res.ok) {
      setUrl(res.url);
      setEmail(res.email);
      setEmailSent(res.emailSent);
      setCopied(false);
      setOpen(true);
      toast.success(
        res.emailSent
          ? `Set-password link sent to ${res.email}.`
          : "Link generated. The email didn't send — copy it below.",
      );
    } else {
      toast.error(res.error ?? "Could not generate a set-password link.");
    }
  }

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy — select the text and copy it manually.");
    }
  }

  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set-password link</DialogTitle>
          <DialogDescription>
            {emailSent
              ? `We emailed this link to ${email ?? "the broker"}. You can also copy it or open it yourself.`
              : `Email delivery failed. Copy this link and send it to ${email ?? "the broker"} directly.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={url ?? ""}
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyLink}
              className="shrink-0 gap-1.5"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Single-use, expires in 7 days. Opening it lets you set the password
            for the broker.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          {url && (
            <Button asChild className="gap-1.5">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Open link
              </a>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { resend, pending, dialog };
}
