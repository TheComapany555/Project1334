"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getEmailSignatureSettings,
  updateEmailSignatureSettings,
  type EmailSignatureSettings,
} from "@/lib/actions/profile";
import {
  buildAutoSignatureHtml,
  sanitizeCustomSignatureHtml,
} from "@/lib/email-signatures-render";
import { Loader2, Save, MailCheck, Eye } from "lucide-react";

export function EmailSignatureCard() {
  const [initial, setInitial] = useState<EmailSignatureSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState("");
  const [customHtml, setCustomHtml] = useState("");
  const [saving, setSaving] = useState(false);

  // Initial load — pulls both the broker's saved settings and the full
  // preview context (profile + agency snapshot) in a single round-trip.
  useEffect(() => {
    let mounted = true;
    getEmailSignatureSettings().then((s) => {
      if (!mounted) return;
      setInitial(s);
      setEnabled(s?.signature_enabled !== false);
      setTitle(s?.signature_title ?? "");
      setCustomHtml(s?.signature_html ?? "");
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Live preview is computed entirely client-side from the snapshot returned
  // on mount, so each keystroke just rebuilds an HTML string locally. No
  // server round-trip per debounced edit.
  const previewHtml = useMemo<string | null>(() => {
    if (!initial || !enabled) return null;
    if (customHtml.trim()) return sanitizeCustomSignatureHtml(customHtml);
    return buildAutoSignatureHtml({
      brokerName: initial.context.brokerName,
      brokerTitle: title || null,
      brokerPhone: initial.context.brokerPhone,
      brokerEmail: initial.context.brokerEmail,
      brokerProfileUrl: initial.context.brokerProfileUrl,
      brokerPhotoUrl: initial.context.brokerPhotoUrl,
      agencyName: initial.context.agencyName,
      agencyLogoUrl: initial.context.agencyLogoUrl,
      agencyWebsite: initial.context.agencyWebsite,
      agencyDisclaimer: initial.context.agencyDisclaimer,
      social: initial.context.social,
    });
  }, [initial, enabled, title, customHtml]);

  async function onSave() {
    setSaving(true);
    const result = await updateEmailSignatureSettings({
      signature_enabled: enabled,
      signature_title: title || null,
      signature_html: customHtml || null,
    });
    setSaving(false);
    if (result.ok) {
      toast.success("Signature saved.");
      // Snapshot the new "saved" state — keep the cached context as-is so
      // the preview keeps rendering against the same profile/agency data.
      setInitial((prev) =>
        prev
          ? {
              ...prev,
              signature_enabled: enabled,
              signature_title: title || null,
              signature_html: customHtml || null,
            }
          : prev,
      );
    } else {
      toast.error(result.error ?? "Could not save signature.");
    }
  }

  const dirty =
    !!initial &&
    (initial.signature_enabled !== enabled ||
      (initial.signature_title ?? "") !== title ||
      (initial.signature_html ?? "") !== customHtml);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MailCheck className="h-4 w-4 text-primary" />
            Email signature
          </CardTitle>
          <CardDescription>
            Automatically appended to every email you send through Salebiz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MailCheck className="h-4 w-4 text-primary" />
          Email signature
        </CardTitle>
        <CardDescription>
          Automatically appended to listing shares, external invites, and
          emails you send to contacts. Leave the custom HTML blank to use the
          default generated from your profile and agency.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Enable / disable */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Append a signature to outbound emails</p>
            <p className="text-xs text-muted-foreground">
              Turn this off to send emails without any auto-appended signature.
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            aria-label="Enable email signature"
          />
        </div>

        <Separator />

        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="signature-title" className="text-sm font-medium">
            Title <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="signature-title"
            placeholder="Senior Business Broker"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            disabled={!enabled}
          />
          <p className="text-xs text-muted-foreground">
            Shown next to your name. Phone, email, agency, logo, and social
            links are pulled from your profile and agency automatically.
          </p>
        </div>

        {/* Custom HTML override */}
        <div className="space-y-1.5">
          <Label htmlFor="signature-html" className="text-sm font-medium">
            Custom HTML signature{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="signature-html"
            placeholder="<p>Paste your own HTML signature here to override the default.</p>"
            value={customHtml}
            onChange={(e) => setCustomHtml(e.target.value)}
            rows={6}
            disabled={!enabled}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            When set, this is used verbatim instead of the auto-generated
            signature. Useful if you have a specific brand layout.
          </p>
        </div>

        {/* Agency disclaimer note */}
        {initial?.agency_disclaimer && (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Your agency adds a disclaimer to the default signature. To change
            it, ask your agency owner.
          </div>
        )}

        <Separator />

        {/* Live preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-sm font-medium">Preview</p>
          </div>
          <div className="rounded-md border bg-background p-4 min-h-[120px]">
            {!enabled ? (
              <p className="text-xs text-muted-foreground italic">
                Signature is off — outbound emails will be sent without a signature block.
              </p>
            ) : previewHtml ? (
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Add your name and contact details on the Profile tab to populate the default signature.
              </p>
            )}
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={!dirty || saving} className="h-10">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save signature
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
