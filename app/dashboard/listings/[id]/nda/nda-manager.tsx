"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { upsertListingNda, deleteListingNda } from "@/lib/actions/nda";
import type { ListingNda, NdaSignature } from "@/lib/types/nda";
import {
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Users,
  FileSignature,
} from "lucide-react";

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
  listingTitle: string;
  initialNda: ListingNda | null;
  signatures: NdaSignature[];
};

export function NdaManager({
  listingId,
  listingTitle,
  initialNda,
  signatures,
}: Props) {
  const [nda, setNda] = useState(initialNda);
  const [ndaText, setNdaText] = useState(nda?.nda_text ?? DEFAULT_NDA_TEXT);
  const [isRequired, setIsRequired] = useState(nda?.is_required ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    if (!ndaText.trim()) {
      setError("NDA text is required.");
      return;
    }
    setSaving(true);
    const result = await upsertListingNda(listingId, ndaText, isRequired);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
    } else {
      setNda({
        id: nda?.id ?? "",
        listing_id: listingId,
        nda_text: ndaText,
        is_required: isRequired,
        created_at: nda?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setSuccess("NDA settings saved.");
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    const result = await deleteListingNda(listingId);
    setSaving(false);
    if (result.ok) {
      setNda(null);
      setNdaText(DEFAULT_NDA_TEXT);
      setSuccess("NDA removed.");
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/dashboard/listings/${listingId}/documents`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">NDA Configuration</h1>
          <p className="text-sm text-muted-foreground truncate max-w-md">
            {listingTitle}
          </p>
        </div>
      </div>

      {/* NDA Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            NDA Settings
          </CardTitle>
          <CardDescription>
            Configure the Non-Disclosure Agreement buyers must sign before
            accessing confidential documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
              />
              <span className="text-sm font-medium">
                Require NDA for confidential documents
              </span>
            </label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nda-text">NDA Text</Label>
            <textarea
              id="nda-text"
              className="w-full min-h-[300px] rounded-lg border border-border bg-background p-3 text-sm font-mono resize-y focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-1"
              value={ndaText}
              onChange={(e) => setNdaText(e.target.value)}
              placeholder="Enter the NDA text..."
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </div>
          )}

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

      {/* Signed NDAs */}
      {signatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              NDA Signatories ({signatures.length})
            </CardTitle>
            <CardDescription>
              Buyers who have signed the NDA for this listing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {signatures.map((sig) => (
                <SignatureCard key={sig.id} sig={sig} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SignatureCard({ sig }: { sig: NdaSignature }) {
  const [showSignature, setShowSignature] = useState(false);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <FileSignature className="h-5 w-5 shrink-0 text-emerald-600" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{sig.signer_name}</p>
          <p className="text-xs text-muted-foreground">{sig.signer_email}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSignature(!showSignature)}
          >
            {showSignature ? "Hide" : "View"} Signature
          </Button>
          <div className="text-right">
            <Badge variant="secondary" className="text-[10px]">
              Signed
            </Badge>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {new Date(sig.signed_at).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
      {showSignature && sig.signature_data && (
        <div className="border-t border-border bg-muted/30 px-4 py-3">
          <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">
            Digital Signature
          </p>
          <div className="rounded border border-border bg-white dark:bg-muted/20 p-2 inline-block">
            <img
              src={sig.signature_data}
              alt={`Signature of ${sig.signer_name}`}
              className="max-h-20 w-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
