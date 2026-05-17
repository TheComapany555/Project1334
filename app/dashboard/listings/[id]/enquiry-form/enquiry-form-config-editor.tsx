"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, MessageSquare } from "lucide-react";
import {
  upsertListingEnquiryFormConfig,
  resetListingEnquiryFormConfig,
} from "@/lib/actions/enquiry-form-config";
import {
  MAX_CUSTOM_QUESTIONS,
  type EnquiryCustomQuestion,
  type EnquiryCustomQuestionKind,
  type ListingEnquiryFormConfig,
} from "@/lib/types/enquiry-form-config";

type Props = {
  listingId: string;
  listingTitle: string;
  initialConfig: ListingEnquiryFormConfig;
};

type FieldKey =
  | "phone"
  | "budget"
  | "funding"
  | "industry"
  | "timeframe";

const QUALIFYING_FIELDS: Array<{
  key: FieldKey;
  label: string;
  hint: string;
}> = [
  { key: "phone", label: "Phone number", hint: "Always shown by default. Toggle off to skip phone entirely." },
  { key: "budget", label: "Budget range", hint: "Free-text, e.g. \"$250k–$500k\"." },
  { key: "funding", label: "Funding status", hint: "Self-funded / loan approved / etc." },
  { key: "industry", label: "Industry experience", hint: "Short paragraph from the buyer." },
  { key: "timeframe", label: "Purchase timeframe", hint: "Ready now / 1–3 months / etc." },
];

export function EnquiryFormConfigEditor({
  listingId,
  listingTitle,
  initialConfig,
}: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);

  function toggleShow(key: FieldKey, value: boolean) {
    setConfig((prev) => ({
      ...prev,
      ...(key === "phone"
        ? { show_phone: value, require_phone: value && prev.require_phone }
        : key === "budget"
          ? { show_budget: value, require_budget: value && prev.require_budget }
          : key === "funding"
            ? { show_funding: value, require_funding: value && prev.require_funding }
            : key === "industry"
              ? { show_industry: value, require_industry: value && prev.require_industry }
              : { show_timeframe: value, require_timeframe: value && prev.require_timeframe }),
    }));
  }

  function toggleRequire(key: FieldKey, value: boolean) {
    setConfig((prev) => ({
      ...prev,
      ...(key === "phone"
        ? { require_phone: value }
        : key === "budget"
          ? { require_budget: value }
          : key === "funding"
            ? { require_funding: value }
            : key === "industry"
              ? { require_industry: value }
              : { require_timeframe: value }),
    }));
  }

  function isShown(key: FieldKey): boolean {
    return (
      (key === "phone" && config.show_phone) ||
      (key === "budget" && config.show_budget) ||
      (key === "funding" && config.show_funding) ||
      (key === "industry" && config.show_industry) ||
      (key === "timeframe" && config.show_timeframe)
    );
  }
  function isRequired(key: FieldKey): boolean {
    return (
      (key === "phone" && config.require_phone) ||
      (key === "budget" && config.require_budget) ||
      (key === "funding" && config.require_funding) ||
      (key === "industry" && config.require_industry) ||
      (key === "timeframe" && config.require_timeframe)
    );
  }

  function addCustomQuestion() {
    if (config.custom_questions.length >= MAX_CUSTOM_QUESTIONS) {
      toast.error(`Up to ${MAX_CUSTOM_QUESTIONS} custom questions.`);
      return;
    }
    const newQ: EnquiryCustomQuestion = {
      id: crypto.randomUUID(),
      label: "",
      required: false,
      kind: "text",
    };
    setConfig((prev) => ({
      ...prev,
      custom_questions: [...prev.custom_questions, newQ],
    }));
  }
  function updateQuestion(id: string, patch: Partial<EnquiryCustomQuestion>) {
    setConfig((prev) => ({
      ...prev,
      custom_questions: prev.custom_questions.map((q) =>
        q.id === id ? { ...q, ...patch } : q,
      ),
    }));
  }
  function removeQuestion(id: string) {
    setConfig((prev) => ({
      ...prev,
      custom_questions: prev.custom_questions.filter((q) => q.id !== id),
    }));
  }

  async function handleSave() {
    for (const q of config.custom_questions) {
      if (!q.label.trim()) {
        toast.error("Custom questions need a label.");
        return;
      }
    }
    setSaving(true);
    const res = await upsertListingEnquiryFormConfig(listingId, {
      show_phone: config.show_phone,
      require_phone: config.require_phone,
      show_reason: config.show_reason,
      show_interest: config.show_interest,
      show_budget: config.show_budget,
      require_budget: config.require_budget,
      show_funding: config.show_funding,
      require_funding: config.require_funding,
      show_industry: config.show_industry,
      require_industry: config.require_industry,
      show_timeframe: config.show_timeframe,
      require_timeframe: config.require_timeframe,
      custom_questions: config.custom_questions.map((q) => ({
        ...q,
        label: q.label.trim(),
      })),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Enquiry form saved.");
  }

  async function handleReset() {
    if (!confirm("Reset enquiry form to defaults?")) return;
    setSaving(true);
    const res = await resetListingEnquiryFormConfig(listingId);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setConfig({
      ...initialConfig,
      show_phone: true,
      require_phone: false,
      show_reason: true,
      show_interest: true,
      show_budget: false,
      require_budget: false,
      show_funding: false,
      require_funding: false,
      show_industry: false,
      require_industry: false,
      show_timeframe: false,
      require_timeframe: false,
      custom_questions: [],
    });
    toast.success("Form reset to defaults.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/dashboard/listings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Enquiry form</h1>
          <p className="text-sm text-muted-foreground truncate max-w-md">
            {listingTitle}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Standard fields</CardTitle>
          <CardDescription>
            Email and message are always required. Toggle off any field you
            don&apos;t want to ask about, or mark one required.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-3">
            <Checkbox
              checked={config.show_reason}
              onCheckedChange={(v) =>
                setConfig((prev) => ({ ...prev, show_reason: v === true }))
              }
            />
            <div>
              <p className="text-sm font-medium">Reason dropdown</p>
              <p className="text-xs text-muted-foreground">
                Lets buyers pick why they&apos;re enquiring (general, viewing,
                offer, callback, other).
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3">
            <Checkbox
              checked={config.show_interest}
              onCheckedChange={(v) =>
                setConfig((prev) => ({ ...prev, show_interest: v === true }))
              }
            />
            <div>
              <p className="text-sm font-medium">&quot;What are you looking for?&quot; field</p>
              <p className="text-xs text-muted-foreground">
                Free-text interest line. Helps match buyers with other listings.
              </p>
            </div>
          </label>

          <hr className="border-border" />

          {QUALIFYING_FIELDS.map(({ key, label, hint }) => (
            <div
              key={key}
              className="flex items-start justify-between gap-3 py-1"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={isShown(key)}
                    onCheckedChange={(v) => toggleShow(key, v === true)}
                  />
                  Show
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={isRequired(key)}
                    onCheckedChange={(v) => toggleRequire(key, v === true)}
                    disabled={!isShown(key)}
                  />
                  Required
                </label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Custom questions
          </CardTitle>
          <CardDescription>
            Up to {MAX_CUSTOM_QUESTIONS} extra questions tailored to this
            listing. Answers are saved with each enquiry and visible from the
            buyer&apos;s CRM panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.custom_questions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No custom questions yet.</p>
          ) : (
            config.custom_questions.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-lg border border-border p-3 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="text-xs text-muted-foreground mt-2 w-5 shrink-0">
                    {idx + 1}.
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label htmlFor={`q-${q.id}-label`} className="text-xs">
                        Question
                      </Label>
                      <Input
                        id={`q-${q.id}-label`}
                        value={q.label}
                        onChange={(e) =>
                          updateQuestion(q.id, { label: e.target.value })
                        }
                        placeholder="e.g. Have you owned a business before?"
                        maxLength={200}
                      />
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="space-y-1">
                        <Label className="text-xs">Answer type</Label>
                        <Select
                          value={q.kind}
                          onValueChange={(v) =>
                            updateQuestion(q.id, {
                              kind: v as EnquiryCustomQuestionKind,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Short answer</SelectItem>
                            <SelectItem value="long_text">Long answer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <label className="flex items-center gap-2 text-xs mt-5">
                        <Checkbox
                          checked={q.required}
                          onCheckedChange={(v) =>
                            updateQuestion(q.id, { required: v === true })
                          }
                        />
                        Required
                      </label>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeQuestion(q.id)}
                    aria-label="Remove question"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}

          {config.custom_questions.length < MAX_CUSTOM_QUESTIONS && (
            <Button
              variant="outline"
              size="sm"
              onClick={addCustomQuestion}
              className="gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add question
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
        <Button variant="ghost" onClick={handleReset} disabled={saving}>
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
