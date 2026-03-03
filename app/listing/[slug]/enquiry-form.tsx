"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitEnquiry } from "@/lib/actions/enquiries";

const REASON_OPTIONS = [
  { value: "general", label: "General enquiry" },
  { value: "request_viewing", label: "Request viewing" },
  { value: "make_offer", label: "Make an offer" },
  { value: "other", label: "Other" },
] as const;

type Props = { listingId: string };

export function EnquiryForm({ listingId }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    if (reason) formData.set("reason", reason);
    const result = await submitEnquiry(listingId, formData);
    setSubmitting(false);
    if (result.ok) {
      setSubmitted(true);
      form.reset();
      setReason("");
      toast.success("Enquiry sent. The broker will contact you soon.");
    } else {
      toast.error(result.error ?? "Failed to send.");
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enquiry sent</CardTitle>
          <CardDescription>
            Thanks for your interest. The broker will contact you using the details you provided.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send an enquiry</CardTitle>
        <CardDescription>
          Contact the broker about this listing. Your details will not be shared elsewhere.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="enquiry-reason">Reason (optional)</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="enquiry-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="enquiry-message">Message *</Label>
            <Textarea
              id="enquiry-message"
              name="message"
              required
              minLength={10}
              placeholder="Tell the broker what you'd like to know or arrange..."
              rows={4}
              className="resize-none"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="enquiry-name">Your name (optional)</Label>
              <Input
                id="enquiry-name"
                name="contact_name"
                type="text"
                placeholder="Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enquiry-email">Your email *</Label>
              <Input
                id="enquiry-email"
                name="contact_email"
                type="email"
                required
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="enquiry-phone">Phone (optional)</Label>
            <Input
              id="enquiry-phone"
              name="contact_phone"
              type="tel"
              placeholder="Phone number"
            />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send enquiry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
