"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAgencySignatureDisclaimer,
  updateAgencySignatureDisclaimer,
} from "@/lib/actions/agencies";
import { ShieldCheck, Loader2, Save } from "lucide-react";

const MAX_LEN = 1000;

export function AgencySignatureDisclaimerCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState<string>("");
  const [value, setValue] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    getAgencySignatureDisclaimer().then((d) => {
      if (!mounted) return;
      setInitial(d ?? "");
      setValue(d ?? "");
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function onSave() {
    setSaving(true);
    const result = await updateAgencySignatureDisclaimer(value || null);
    setSaving(false);
    if (result.ok) {
      toast.success("Signature disclaimer updated.");
      setInitial(value);
    } else {
      toast.error(result.error ?? "Could not update disclaimer.");
    }
  }

  const dirty = initial !== value;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Email signature disclaimer
        </CardTitle>
        <CardDescription>
          Appended to the auto-built email signature of every broker in your
          agency. Use this for legal disclaimers, confidentiality notes, or
          regulatory text.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="agency-signature-disclaimer" className="text-sm font-medium">
                Disclaimer text
              </Label>
              <Textarea
                id="agency-signature-disclaimer"
                placeholder="This email and any attachments are confidential…"
                value={value}
                onChange={(e) => setValue(e.target.value.slice(0, MAX_LEN))}
                rows={5}
              />
              <p className="text-xs text-muted-foreground text-right">
                {value.length} / {MAX_LEN}
              </p>
            </div>
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
                    Save disclaimer
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
