"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldCheck, Send, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getKybForContactListing,
  saveKybCompliance,
  sendBuyerVerification,
  sendCompanyVerification,
} from "@/lib/actions/kyb";
import {
  KYB_STATUS_LABEL,
  KYB_STATUS_TONE,
  PURCHASING_STRUCTURE_OPTIONS,
  SOURCE_OF_FUNDS_OPTIONS,
  COMPANY_STRUCTURES,
  type KybBuyerIdentity,
  type KybListingCompliance,
  type KybComplianceInput,
  type PurchasingStructure,
  type SourceOfFunds,
} from "@/lib/types/kyb";
import { Building2 } from "lucide-react";

type ListingOption = { listing_id: string; title: string };

const EMPTY_FORM: KybComplianceInput = {
  fullLegalName: "",
  dob: null,
  residentialAddress: "",
  purchasingStructure: null,
  companyName: "",
  acnAbn: "",
  beneficialOwner: "",
  sourceOfFunds: null,
  actingOnBehalf: null,
  beneficialOwnersOffshore: null,
  isPep: null,
};

type Tri = "yes" | "no" | "";
const toTri = (v: boolean | null): Tri => (v === true ? "yes" : v === false ? "no" : "");
const fromTri = (v: Tri): boolean | null => (v === "yes" ? true : v === "no" ? false : null);

export function KybTab({
  contactId,
  listings,
}: {
  contactId: string | null;
  listings: ListingOption[];
}) {
  const [listingId, setListingId] = useState<string | null>(
    listings[0]?.listing_id ?? null,
  );
  const [identity, setIdentity] = useState<KybBuyerIdentity | null>(null);
  const [compliance, setCompliance] = useState<KybListingCompliance | null>(null);
  const [companyAvailable, setCompanyAvailable] = useState(false);
  const [form, setForm] = useState<KybComplianceInput>(EMPTY_FORM);
  const [loading, startLoad] = useTransition();
  const [saving, startSave] = useTransition();
  const [sending, startSend] = useTransition();
  const [sendingCompany, startSendCompany] = useTransition();

  const load = useCallback(() => {
    if (!contactId || !listingId) return;
    startLoad(async () => {
      const res = await getKybForContactListing(contactId, listingId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { identity: id, compliance: c } = res.data;
      setIdentity(id);
      setCompliance(c);
      setCompanyAvailable(res.data.companyAvailable);
      setForm({
        fullLegalName: c?.full_legal_name ?? "",
        // DOB / address fall back to the values Sumsub verified for this buyer.
        dob: c?.dob ?? id?.verified_dob ?? null,
        residentialAddress: c?.residential_address ?? id?.verified_address ?? "",
        purchasingStructure: c?.purchasing_structure ?? null,
        companyName: c?.company_name ?? "",
        acnAbn: c?.acn_abn ?? "",
        beneficialOwner: c?.beneficial_owner ?? "",
        sourceOfFunds: c?.source_of_funds ?? null,
        actingOnBehalf: c?.acting_on_behalf ?? null,
        beneficialOwnersOffshore: c?.beneficial_owners_offshore ?? null,
        isPep: c?.is_pep ?? null,
      });
    });
  }, [contactId, listingId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Guard states ──────────────────────────────────────────────────────────
  if (!contactId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Add this buyer to your CRM to run identity verification.
        </CardContent>
      </Card>
    );
  }
  if (listings.length === 0 || !listingId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Link this buyer to one of your listings first — Know Your Buyer is
          recorded per listing.
        </CardContent>
      </Card>
    );
  }

  const set = <K extends keyof KybComplianceInput>(
    key: K,
    value: KybComplianceInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    if (!contactId || !listingId) return;
    startSave(async () => {
      const res = await saveKybCompliance({ contactId, listingId, ...form });
      if (res.ok) toast.success("Compliance details saved");
      else toast.error(res.error);
    });
  };

  const handleSend = () => {
    if (!contactId || !listingId) return;
    startSend(async () => {
      const res = await sendBuyerVerification({ contactId, listingId });
      if (res.ok) {
        toast.success("Verification link emailed to the buyer");
        load();
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleSendCompany = () => {
    if (!contactId || !listingId) return;
    startSendCompany(async () => {
      const res = await sendCompanyVerification({ contactId, listingId });
      if (res.ok) {
        toast.success("Company verification link emailed to the buyer");
        load();
      } else {
        toast.error(res.error);
      }
    });
  };

  const showCompany =
    form.purchasingStructure != null &&
    COMPANY_STRUCTURES.includes(form.purchasingStructure);
  const companyStatus = compliance?.company_verification_status ?? "not_started";

  const status = identity?.verification_status ?? "not_started";
  const result = identity?.individual_result as
    | { reviewAnswer?: string; rejectLabels?: string[] }
    | null;

  return (
    <div className="space-y-4">
      {/* Listing context selector (the form is recorded per listing) */}
      {listings.length > 1 && (
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">For listing</Label>
          <Select value={listingId} onValueChange={setListingId}>
            <SelectTrigger size="sm" className="h-8 w-auto min-w-[220px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {listings.map((l) => (
                <SelectItem key={l.listing_id} value={l.listing_id} className="text-xs">
                  {l.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Identity verification status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Identity verification
              </CardTitle>
              <CardDescription className="text-xs">
                Verified once per buyer via Sumsub, reused across their listings.
              </CardDescription>
            </div>
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                KYB_STATUS_TONE[status],
              )}
            >
              {KYB_STATUS_LABEL[status]}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
            <Field label="Verified on" value={fmtDate(identity?.verified_at)} />
            <Field label="Reference" value={identity?.verification_reference} />
            <Field
              label="Result"
              value={
                result?.reviewAnswer
                  ? result.reviewAnswer +
                    (result.rejectLabels?.length
                      ? ` (${result.rejectLabels.join(", ")})`
                      : "")
                  : null
              }
            />
            <Field label="DOB (from Sumsub)" value={fmtDate(identity?.verified_dob)} />
            <Field
              label="Address (from Sumsub)"
              value={identity?.verified_address}
            />
            <Field label="Link sent" value={fmtDate(identity?.link_sent_at)} />
          </dl>
          <div>
            <Button size="sm" onClick={handleSend} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : status === "not_started" ? (
                <Send className="h-4 w-4" aria-hidden />
              ) : (
                <ExternalLink className="h-4 w-4" aria-hidden />
              )}
              {status === "not_started"
                ? "Send verification request"
                : "Resend verification link"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compliance form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Buyer compliance details</CardTitle>
          <CardDescription className="text-xs">
            Recorded for this buyer on this listing. DOB and address pre-fill from
            Sumsub once verified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormRow label="Full legal name">
                  <Input
                    value={form.fullLegalName}
                    onChange={(e) => set("fullLegalName", e.target.value)}
                    placeholder="As it appears on ID"
                  />
                </FormRow>
                <FormRow label="Date of birth">
                  <Input
                    type="date"
                    value={form.dob ?? ""}
                    onChange={(e) => set("dob", e.target.value || null)}
                  />
                </FormRow>
              </div>

              <FormRow label="Residential address">
                <Textarea
                  rows={2}
                  value={form.residentialAddress}
                  onChange={(e) => set("residentialAddress", e.target.value)}
                />
              </FormRow>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormRow label="Purchasing structure">
                  <OptionSelect
                    value={form.purchasingStructure ?? ""}
                    onChange={(v) =>
                      set("purchasingStructure", (v || null) as PurchasingStructure | null)
                    }
                    placeholder="Select structure"
                    options={PURCHASING_STRUCTURE_OPTIONS}
                  />
                </FormRow>
                <FormRow label="Source of funds">
                  <OptionSelect
                    value={form.sourceOfFunds ?? ""}
                    onChange={(v) =>
                      set("sourceOfFunds", (v || null) as SourceOfFunds | null)
                    }
                    placeholder="Select source"
                    options={SOURCE_OF_FUNDS_OPTIONS}
                  />
                </FormRow>
                <FormRow label="Company name">
                  <Input
                    value={form.companyName}
                    onChange={(e) => set("companyName", e.target.value)}
                  />
                </FormRow>
                <FormRow label="ACN / ABN">
                  <Input
                    value={form.acnAbn}
                    onChange={(e) => set("acnAbn", e.target.value)}
                  />
                </FormRow>
              </div>

              <FormRow label="Beneficial owner">
                <Input
                  value={form.beneficialOwner}
                  onChange={(e) => set("beneficialOwner", e.target.value)}
                  placeholder="Name of the ultimate beneficial owner"
                />
              </FormRow>

              <div className="grid gap-4 sm:grid-cols-3">
                <FormRow label="Acting on behalf of another?">
                  <TriSelect
                    value={toTri(form.actingOnBehalf)}
                    onChange={(v) => set("actingOnBehalf", fromTri(v))}
                  />
                </FormRow>
                <FormRow label="Beneficial owners offshore?">
                  <TriSelect
                    value={toTri(form.beneficialOwnersOffshore)}
                    onChange={(v) => set("beneficialOwnersOffshore", fromTri(v))}
                  />
                </FormRow>
                <FormRow label="Politically Exposed Person (PEP)?">
                  <TriSelect
                    value={toTri(form.isPep)}
                    onChange={(v) => set("isPep", fromTri(v))}
                  />
                </FormRow>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Save details
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Company (KYB) verification — only for company/trust structures */}
      {showCompany && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                  <Building2 className="h-4 w-4" aria-hidden />
                  Company verification
                </CardTitle>
                <CardDescription className="text-xs">
                  Verifies the purchasing entity and its beneficial owners via Sumsub.
                </CardDescription>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-medium",
                  KYB_STATUS_TONE[companyStatus],
                )}
              >
                {KYB_STATUS_LABEL[companyStatus]}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
              <Field label="Verified on" value={fmtDate(compliance?.company_verified_at)} />
              <Field label="Reference" value={compliance?.company_verification_reference} />
              <Field label="Link sent" value={fmtDate(compliance?.company_link_sent_at)} />
              <Field
                label="Beneficial owners"
                value={
                  Array.isArray(compliance?.beneficial_owner_result)
                    ? `${(compliance.beneficial_owner_result as unknown[]).length} found`
                    : null
                }
              />
            </dl>
            {companyAvailable ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendCompany}
                disabled={sendingCompany}
              >
                {sendingCompany ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                {companyStatus === "not_started"
                  ? "Send company verification"
                  : "Resend company link"}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Company verification isn&apos;t enabled yet. Save the company
                details now; an admin can switch on Sumsub company (KYB)
                verification to activate it.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Small presentational helpers ────────────────────────────────────────────

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function OptionSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-sm">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TriSelect({ value, onChange }: { value: Tri; onChange: (v: Tri) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Tri)}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="yes" className="text-sm">Yes</SelectItem>
        <SelectItem value="no" className="text-sm">No</SelectItem>
      </SelectContent>
    </Select>
  );
}

function fmtDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
