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
import { Loader2, CheckCircle2, Send, Mail, User, Phone, PhoneCall } from "lucide-react";

const REASON_OPTIONS = [
  { value: "general", label: "General enquiry" },
  { value: "request_viewing", label: "Request viewing" },
  { value: "make_offer", label: "Make an offer" },
  { value: "request_callback", label: "Request call back" },
  { value: "other", label: "Other" },
] as const;

type Props = { listingId: string; listingTitle?: string };

export function EnquiryForm({ listingId, listingTitle }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [callbackMode, setCallbackMode] = useState(false);

  function handleRequestCallback() {
    setCallbackMode(true);
    setReason("request_callback");
    setMessage(
      `I'd like to request a call back regarding "${listingTitle || "this listing"}". Please contact me at your earliest convenience.`
    );
    setTimeout(() => {
      document.getElementById("enquiry-form-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }

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
      setMessage("");
      setCallbackMode(false);
      toast.success(
        callbackMode
          ? "Call back request sent. The broker will contact you soon."
          : "Enquiry sent. The broker will contact you soon."
      );
    } else {
      toast.error(result.error ?? "Failed to send.");
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle>
            {callbackMode ? "Call back requested" : "Enquiry sent"}
          </CardTitle>
          <CardDescription className="leading-relaxed">
            Thanks for your interest. The broker will contact you using the details you provided.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSubmitted(false)}
          >
            Send another enquiry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Request Call Back button */}
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex flex-col sm:flex-row items-center gap-3 py-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <PhoneCall className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-medium text-foreground">
              Want to discuss this listing?
            </p>
            <p className="text-xs text-muted-foreground">
              Request a call back and the broker will get in touch
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleRequestCallback}
            className="gap-1.5 shrink-0"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            Request call back
          </Button>
        </CardContent>
      </Card>

      {/* Enquiry form */}
      <Card id="enquiry-form-card">
        <CardHeader>
          <CardTitle>
            {callbackMode ? "Request a call back" : "Send an enquiry"}
          </CardTitle>
          <CardDescription>
            {callbackMode
              ? "Leave your details and the broker will call you back."
              : "Contact the broker about this listing. Your details will not be shared elsewhere."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="enquiry-reason">Reason (optional)</Label>
              <Select value={reason} onValueChange={(v) => { setReason(v); setCallbackMode(v === "request_callback"); }}>
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
                placeholder={
                  callbackMode
                    ? "Any specific topics you'd like to discuss on the call..."
                    : "Tell the broker what you'd like to know or arrange..."
                }
                rows={4}
                className="resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="enquiry-name">
                  Your name {callbackMode ? "*" : "(optional)"}
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="enquiry-name"
                    name="contact_name"
                    type="text"
                    required={callbackMode}
                    placeholder="Name"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="enquiry-email">Your email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="enquiry-email"
                    name="contact_email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="enquiry-phone">
                Phone {callbackMode ? "*" : "(optional)"}
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="enquiry-phone"
                  name="contact_phone"
                  type="tel"
                  required={callbackMode}
                  placeholder="Phone number"
                  className="pl-9"
                />
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="w-full gap-2">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : callbackMode ? (
                <>
                  <PhoneCall className="h-4 w-4" />
                  Request call back
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send enquiry
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
