"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SignaturePad } from "./signature-pad";
import { signNda } from "@/lib/actions/nda";
import { ShieldCheck, Lock, CheckCircle2, AlertCircle } from "lucide-react";

type Props = {
  listingId: string;
  ndaText: string;
  onSigned: () => void;
  children?: React.ReactNode;
};

export function NdaSignDialog({ listingId, ndaText, onSigned, children }: Props) {
  const [open, setOpen] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  const handleSign = async () => {
    setError(null);
    if (!signerName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!signatureData) {
      setError("Please draw your signature.");
      return;
    }

    setLoading(true);
    const result = await signNda(listingId, signatureData, signerName);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSigned(true);
    setTimeout(() => {
      setOpen(false);
      onSigned();
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <ShieldCheck className="h-4 w-4 mr-2" />
            Sign NDA to Unlock
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {signed ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="rounded-full bg-emerald-100 dark:bg-emerald-950/30 p-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold">NDA Signed Successfully</h3>
            <p className="text-sm text-muted-foreground">
              You now have access to confidential documents for this listing.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Non-Disclosure Agreement
              </DialogTitle>
              <DialogDescription>
                Please read and sign the NDA to access confidential information
                for this listing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* NDA Text */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 sm:p-4 max-h-48 overflow-y-auto">
                <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                  {ndaText}
                </p>
              </div>

              <Separator />

              {/* Signer Name */}
              <div className="space-y-2">
                <Label htmlFor="signer-name">Full Legal Name</Label>
                <Input
                  id="signer-name"
                  placeholder="Enter your full name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                />
              </div>

              {/* Signature */}
              <div className="space-y-2">
                <Label>Signature</Label>
                <SignaturePad
                  onSignatureChange={setSignatureData}
                  height={120}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSign} disabled={loading}>
                  {loading ? "Signing..." : "Sign & Accept NDA"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
