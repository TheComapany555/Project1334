"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Mail } from "lucide-react";

/**
 * Tiny card surfacing the broker's private inbound BCC address. BCC'ing it
 * on outbound emails from any client (Gmail, Outlook…) automatically logs
 * those emails to the CRM.
 */
export function BccAddressCard({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast.success("BCC address copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — please copy manually");
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="rounded-md bg-primary/10 p-2 shrink-0">
            <Mail className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Your private CRM email</p>
            <p className="text-xs text-muted-foreground">
              BCC this address from your normal inbox and emails will be
              auto-logged to the right contact.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <code className="rounded-md border bg-muted px-2.5 py-1.5 text-xs font-mono break-all">
            {email}
          </code>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
