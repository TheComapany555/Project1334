"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Trash2 } from "lucide-react";
import { upsertListingNda, deleteListingNda } from "@/lib/actions/nda";
import type { ListingNda } from "@/lib/types/nda";

const DEFAULT_NDA_TEXT = `NON-DISCLOSURE AGREEMENT

By signing this agreement, you acknowledge and agree to the following:

1. CONFIDENTIALITY: All information provided to you regarding this business listing, including but not limited to financial data, customer information, trade secrets, and operational details ("Confidential Information"), shall be kept strictly confidential.

2. NON-DISCLOSURE: You agree not to disclose, publish, or otherwise reveal any Confidential Information to any third party without the prior written consent of the business owner or their authorized representative.

3. PURPOSE: The Confidential Information shall be used solely for the purpose of evaluating a potential acquisition of the business and for no other purpose.

4. RETURN OF INFORMATION: Upon request or upon deciding not to proceed with the acquisition, you agree to return or destroy all copies of Confidential Information in your possession.

5. TERM: This agreement remains in effect for a period of two (2) years from the date of signing.

6. REMEDIES: You acknowledge that any breach of this agreement may cause irreparable harm, and that the business owner shall be entitled to seek injunctive relief in addition to any other available remedies.`;

type Props = {
  listingId: string;
  initialNda: ListingNda | null;
};

export function NdaTemplatePanel({ listingId, initialNda }: Props) {
  const [nda, setNda] = useState(initialNda);
  const [ndaText, setNdaText] = useState(nda?.nda_text ?? DEFAULT_NDA_TEXT);
  const [isRequired, setIsRequired] = useState(nda?.is_required ?? true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!ndaText.trim()) {
      toast.error("NDA text is required.");
      return;
    }
    setSaving(true);
    const result = await upsertListingNda(listingId, ndaText, isRequired);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setNda({
      id: nda?.id ?? "",
      listing_id: listingId,
      nda_text: ndaText,
      is_required: isRequired,
      created_at: nda?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    toast.success("NDA settings saved.");
  }

  async function handleDelete() {
    setSaving(true);
    const result = await deleteListingNda(listingId);
    setSaving(false);
    if (result.ok) {
      setNda(null);
      setNdaText(DEFAULT_NDA_TEXT);
      toast.success("NDA removed.");
    } else {
      toast.error("Failed to remove NDA.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          NDA Template
        </CardTitle>
        <CardDescription>
          The agreement buyers must sign before they can request data-room
          access. Edit it to fit your jurisdiction or business.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
          />
          <span className="text-sm font-medium">
            Require buyers to sign this NDA before requesting data-room access
          </span>
        </label>

        <div className="space-y-2">
          <Label htmlFor="nda-text">NDA text</Label>
          <textarea
            id="nda-text"
            className="w-full min-h-[300px] rounded-lg border border-border bg-background p-3 text-sm font-mono resize-y focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-1"
            value={ndaText}
            onChange={(e) => setNdaText(e.target.value)}
            placeholder="Enter the NDA text..."
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : nda ? "Update NDA" : "Enable NDA"}
          </Button>
          {nda && (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Remove NDA
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
