"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, Save, Trash2, FileText, Send, History } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  sendCrmEmail,
  saveEmailTemplate,
  deleteEmailTemplate,
  listEmailTemplates,
  logExternalEmail,
  type EmailTemplate,
} from "@/lib/actions/crm-email";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactEmail: string;
  contactName: string | null;
  listingId?: string | null;
  listingTitle?: string | null;
  /** Called after a successful send so callers can refresh related data. */
  onSent?: () => void;
};

const MERGE_FIELDS = [
  { key: "first_name", label: "First name" },
  { key: "full_name", label: "Full name" },
  { key: "broker_name", label: "Your name" },
  { key: "broker_company", label: "Your company" },
  { key: "listing_title", label: "Listing title" },
];

export function EmailComposer({
  open,
  onOpenChange,
  contactId,
  contactEmail,
  contactName,
  listingId,
  listingTitle,
  onSent,
}: Props) {
  const [mode, setMode] = useState<"send" | "log">("send");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sentAt, setSentAt] = useState(() => {
    // Pre-fill with today's date in YYYY-MM-DD format for the "Log past email" mode.
    return new Date().toISOString().slice(0, 10);
  });
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [isSending, startSendTransition] = useTransition();

  // Fetch templates lazily on open.
  useEffect(() => {
    if (!open) return;
    listEmailTemplates().then(setTemplates).catch(() => setTemplates([]));
  }, [open]);

  // Reset on close.
  useEffect(() => {
    if (open) return;
    setMode("send");
    setSubject("");
    setBody("");
    setSentAt(new Date().toISOString().slice(0, 10));
    setTemplateName("");
    setShowSaveTemplate(false);
  }, [open]);

  const handleLoadTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
    toast.message(`Loaded template "${t.name}"`);
  };

  const handleDeleteTemplate = async (id: string) => {
    const res = await deleteEmailTemplate(id);
    if (res.ok) {
      setTemplates((ts) => ts.filter((t) => t.id !== id));
      toast.success("Template removed");
    } else {
      toast.error(res.error);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Give the template a name");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error("Fill out the subject and body first");
      return;
    }
    setSavingTemplate(true);
    const res = await saveEmailTemplate({
      name: templateName.trim(),
      subject,
      body,
    });
    setSavingTemplate(false);
    if (res.ok) {
      setTemplates((ts) => [...ts, res.template]);
      setTemplateName("");
      setShowSaveTemplate(false);
      toast.success("Template saved");
    } else {
      toast.error(res.error);
    }
  };

  const insertMergeField = (key: string) => {
    setBody((b) => `${b}{{${key}}}`);
  };

  const handleSend = () => {
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }
    if (!body.trim()) {
      toast.error("Message body is required");
      return;
    }
    startSendTransition(async () => {
      const res =
        mode === "send"
          ? await sendCrmEmail({
              contactId,
              subject,
              body,
              listingId: listingId ?? null,
            })
          : await logExternalEmail({
              contactId,
              subject,
              body,
              // Treat the date as start-of-day in the user's local tz
              sentAt: new Date(sentAt + "T12:00:00").toISOString(),
              listingId: listingId ?? null,
            });
      if (res.ok) {
        toast.success(
          mode === "send"
            ? `Email sent to ${contactName || contactEmail}`
            : "External email logged to CRM",
        );
        onOpenChange(false);
        onSent?.();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            {mode === "send"
              ? `New email to ${contactName || contactEmail}`
              : `Log past email to ${contactName || contactEmail}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "send"
              ? "Sent from your verified Salebiz address. Replies go straight to your inbox. Auto-logged to the CRM timeline."
              : "Paste an email you already sent from Gmail/Outlook. Salebiz won't re-send it — just records it on the timeline."}
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-md bg-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("send")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded px-3 py-1.5 font-medium transition",
              mode === "send"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Send className="h-3.5 w-3.5" />
            Send now
          </button>
          <button
            type="button"
            onClick={() => setMode("log")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded px-3 py-1.5 font-medium transition",
              mode === "log"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <History className="h-3.5 w-3.5" />
            Log past email
          </button>
        </div>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="email-to">To</Label>
            <Input id="email-to" value={contactEmail} disabled />
          </div>

          {mode === "log" && (
            <div className="space-y-1.5">
              <Label htmlFor="email-sent-at">Sent on</Label>
              <Input
                id="email-sent-at"
                type="date"
                value={sentAt}
                onChange={(e) => setSentAt(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
          )}

          {templates.length > 0 && (
            <div className="space-y-1.5">
              <Label>Load template</Label>
              <div className="flex items-center gap-2">
                <Select value="" onValueChange={handleLoadTemplate}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pick a saved template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email-subject">Subject *</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={
                listingTitle
                  ? `About ${listingTitle}`
                  : "Following up on our chat"
              }
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-body">Message *</Label>
              <div className="flex flex-wrap items-center gap-1 text-[10px]">
                <span className="text-muted-foreground mr-1">Insert:</span>
                {MERGE_FIELDS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => insertMergeField(f.key)}
                    className="rounded border px-1.5 py-0.5 hover:bg-muted transition"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Hi {{first_name}},

Just wanted to follow up about ${listingTitle ?? "the listing"}…

Best,
{{broker_name}}`}
              rows={10}
            />
            <p className="text-[10px] text-muted-foreground">
              Use <code>{"{{first_name}}"}</code> etc. — they're swapped in
              before sending. Plain text only for now.
            </p>
          </div>

          {/* Save-as-template */}
          {showSaveTemplate ? (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2">
              <Label htmlFor="template-name" className="text-xs">
                Template name
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. After NDA — share docs"
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate}
                >
                  {savingTemplate ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSaveTemplate(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowSaveTemplate(true)}
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                <FileText className="h-3 w-3" />
                Save as template
              </button>
              {templates.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-muted-foreground">Manage:</span>
                  {templates.map((t) => (
                    <Badge
                      key={t.id}
                      variant="outline"
                      className="text-[10px] gap-1 cursor-pointer"
                      onClick={() => handleDeleteTemplate(t.id)}
                      title={`Click to delete "${t.name}"`}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                      {t.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {mode === "send" ? (
              <>
                <Send className="h-4 w-4" />
                Send email
              </>
            ) : (
              <>
                <History className="h-4 w-4" />
                Log to CRM
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
