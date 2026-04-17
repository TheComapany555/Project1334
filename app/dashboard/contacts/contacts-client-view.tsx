"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Send,
  Trash2,
  Mail,
  Phone,
  Users,
  Loader2,
  Pencil,
  Tag as TagIcon,
  ShieldCheck,
  ShieldOff,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
import {
  addContact,
  deleteContact,
  sendListingToContact,
  updateContact,
} from "@/lib/actions/contacts";
import {
  TAG_COLOR_CLASSES,
  type BrokerContact,
  type ContactTag,
} from "@/lib/types/contacts";
import { cn } from "@/lib/utils";
import { ContactTagMultiSelect } from "@/components/dashboard/contact-tag-multi-select";
import { ContactTagManager } from "@/components/dashboard/contact-tag-manager";

type Props = {
  contacts: BrokerContact[];
  tags: ContactTag[];
  listings: { id: string; title: string }[];
};

type ContactFormState = {
  name: string;
  email: string;
  phone: string;
  company: string;
  interest: string;
  notes: string;
  consent_marketing: boolean;
  tag_ids: string[];
};

const EMPTY_FORM: ContactFormState = {
  name: "",
  email: "",
  phone: "",
  company: "",
  interest: "",
  notes: "",
  consent_marketing: false,
  tag_ids: [],
};

const SOURCE_LABELS: Record<string, string> = {
  enquiry: "Enquiry",
  manual: "Manual",
  share: "Share",
  import: "Import",
};

function getInitials(name: string | null, email: string) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.charAt(0).toUpperCase();
}

export function ContactsClientView({ contacts, tags: initialTags, listings }: Props) {
  const router = useRouter();
  const [tags, setTags] = useState(initialTags);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [consentFilter, setConsentFilter] = useState<"all" | "yes" | "no">("all");
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BrokerContact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BrokerContact | null>(null);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  const [sendOpen, setSendOpen] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (tagFilter && !c.tags.some((t) => t.id === tagFilter)) return false;
      if (consentFilter === "yes" && !c.consent_marketing) return false;
      if (consentFilter === "no" && c.consent_marketing) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const blob = `${c.name ?? ""} ${c.email} ${c.company ?? ""} ${c.interest ?? ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [contacts, tagFilter, consentFilter, search]);

  const hasFilters = !!tagFilter || consentFilter !== "all" || !!search.trim();

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    await deleteContact(deleteTarget.id);
    setDeleteTarget(null);
    startTransition(() => router.refresh());
  }

  async function handleSend() {
    if (!sendOpen || !selectedListing) return;
    setSendStatus("sending");
    const res = await sendListingToContact(sendOpen, selectedListing);
    setSendStatus(res.ok ? "sent" : "error");
    if (res.ok) {
      setTimeout(() => {
        setSendOpen(null);
        setSendStatus("idle");
        setSelectedListing("");
      }, 1500);
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col gap-3 border-b bg-muted/30 px-4 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base">All contacts</CardTitle>
            <CardDescription>
              {contacts.length === 0
                ? "No contacts yet. Save enquiries or add contacts manually."
                : `${contacts.length} total${filtered.length !== contacts.length ? `, ${filtered.length} shown` : ""}`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setTagManagerOpen(true)}
            >
              <TagIcon className="h-4 w-4" />
              Manage tags
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add contact
            </Button>
          </div>
        </CardHeader>

        {/* Filter bar */}
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:px-6 lg:flex-row lg:items-center">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, company, interest"
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Select
            value={consentFilter}
            onValueChange={(v) => setConsentFilter(v as typeof consentFilter)}
          >
            <SelectTrigger size="sm" className="w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All consent statuses</SelectItem>
              <SelectItem value="yes">Consent given</SelectItem>
              <SelectItem value="no">No consent</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex flex-1 flex-wrap items-center gap-1.5">
            {tags.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                No tags yet. Use Manage tags to create one.
              </span>
            ) : (
              tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
                  className={cn(
                    "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium transition",
                    tagFilter === tag.id
                      ? TAG_COLOR_CLASSES[tag.color]
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {tag.name}
                </button>
              ))
            )}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => {
                  setTagFilter(null);
                  setConsentFilter("all");
                  setSearch("");
                }}
              >
                <X className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
              <div className="rounded-full bg-muted p-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="font-medium">
                  {contacts.length === 0
                    ? "No contacts yet"
                    : "No contacts match your filter"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {contacts.length === 0
                    ? "Save contacts from enquiries or add them manually to build your contact list."
                    : "Try clearing the search or filters above."}
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4 sm:pl-6">Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Tags</TableHead>
                  <TableHead className="hidden lg:table-cell">Interest</TableHead>
                  <TableHead className="hidden sm:table-cell">Source</TableHead>
                  <TableHead className="hidden sm:table-cell">Consent</TableHead>
                  <TableHead className="w-12 pr-4 sm:pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-4 sm:pl-6 py-3 align-top">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                            {getInitials(c.name, c.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {c.name || c.email}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3" />
                              {c.email}
                            </span>
                            {c.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {c.phone}
                              </span>
                            )}
                            {c.company && (
                              <span className="truncate">{c.company}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell py-3 align-top">
                      {c.tags.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No tags</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {c.tags.map((t) => (
                            <Badge
                              key={t.id}
                              variant="outline"
                              className={cn("text-[10px]", TAG_COLOR_CLASSES[t.color])}
                            >
                              {t.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-3 align-top max-w-[220px]">
                      <p className="text-xs text-muted-foreground truncate">
                        {c.interest || "Not specified"}
                      </p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-3 align-top">
                      <Badge variant="outline" className="text-[10px]">
                        {SOURCE_LABELS[c.source] ?? c.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-3 align-top">
                      {c.consent_marketing ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 border-emerald-200 text-emerald-700 dark:border-emerald-900/50 dark:text-emerald-300"
                        >
                          <ShieldCheck className="h-2.5 w-2.5" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 border-muted-foreground/30 text-muted-foreground"
                        >
                          <ShieldOff className="h-2.5 w-2.5" />
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-4 sm:pr-6 py-3 align-top text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Open contact actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onSelect={() => setEditTarget(c)}>
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          {listings.length > 0 && (
                            <DropdownMenuItem
                              onSelect={() => {
                                setSendOpen(c.id);
                                setSendStatus("idle");
                                setSelectedListing("");
                              }}
                            >
                              <Send className="h-3.5 w-3.5" />
                              Send listing
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleteTarget(c)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <ContactFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add Contact"
        description="Add a new contact to your list."
        tags={tags}
        onTagsChanged={setTags}
        initial={EMPTY_FORM}
        emailEditable
        submitLabel="Save Contact"
        onSubmit={async (form) => {
          const res = await addContact(form);
          if (!res.ok) return res.error ?? "Failed to add contact";
          startTransition(() => router.refresh());
          return null;
        }}
      />

      {/* Edit dialog */}
      <ContactFormDialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        title="Edit Contact"
        description="Update contact details and tags."
        tags={tags}
        onTagsChanged={setTags}
        initial={
          editTarget
            ? {
                name: editTarget.name ?? "",
                email: editTarget.email,
                phone: editTarget.phone ?? "",
                company: editTarget.company ?? "",
                interest: editTarget.interest ?? "",
                notes: editTarget.notes ?? "",
                consent_marketing: editTarget.consent_marketing,
                tag_ids: editTarget.tags.map((t) => t.id),
              }
            : EMPTY_FORM
        }
        emailEditable={false}
        submitLabel="Save Changes"
        onSubmit={async (form) => {
          if (!editTarget) return "Missing contact";
          const res = await updateContact(editTarget.id, {
            name: form.name,
            phone: form.phone,
            company: form.company,
            interest: form.interest,
            notes: form.notes,
            consent_marketing: form.consent_marketing,
            tag_ids: form.tag_ids,
          });
          if (!res.ok) return res.error ?? "Failed to update";
          setEditTarget(null);
          startTransition(() => router.refresh());
          return null;
        }}
      />

      {/* Tag manager */}
      <ContactTagManager
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        tags={tags}
        onTagsChanged={(t) => {
          setTags(t);
          startTransition(() => router.refresh());
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name || deleteTarget?.email}
              </span>{" "}
              from your contact list. Their tags and consent record will be removed too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send listing dialog */}
      <Dialog
        open={!!sendOpen}
        onOpenChange={(open) => {
          if (!open) setSendOpen(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Listing</DialogTitle>
            <DialogDescription>
              Choose a listing to email to this contact.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Select listing</Label>
            <Select value={selectedListing} onValueChange={setSelectedListing}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a listing" />
              </SelectTrigger>
              <SelectContent>
                {listings.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            {sendStatus === "sent" ? (
              <p className="text-sm font-medium text-primary">Sent successfully.</p>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!selectedListing || sendStatus === "sending"}
              >
                {sendStatus === "sending" && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                )}
                {sendStatus === "error" ? "Retry" : "Send Email"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ContactFormDialog({
  open,
  onOpenChange,
  title,
  description,
  initial,
  emailEditable,
  submitLabel,
  tags,
  onTagsChanged,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  initial: ContactFormState;
  emailEditable: boolean;
  submitLabel: string;
  tags: ContactTag[];
  onTagsChanged: (tags: ContactTag[]) => void;
  onSubmit: (form: ContactFormState) => Promise<string | null>;
}) {
  const [form, setForm] = useState<ContactFormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const initialKey = `${initial.email}-${initial.name}-${initial.tag_ids.join(",")}`;
  const [lastKey, setLastKey] = useState(initialKey);
  if (open && lastKey !== initialKey) {
    setForm(initial);
    setError(null);
    setLastKey(initialKey);
  }

  const handleSubmit = async () => {
    setError(null);
    if (!form.email.trim()) {
      setError("Email is required");
      return;
    }
    setSubmitting(true);
    const err = await onSubmit(form);
    setSubmitting(false);
    if (err) setError(err);
    else if (emailEditable) {
      setForm(EMPTY_FORM);
      setLastKey("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input
                id="c-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="John Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Phone</Label>
              <Input
                id="c-phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="04XX XXX XXX"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-email">Email *</Label>
            <Input
              id="c-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="john@example.com"
              disabled={!emailEditable}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-company">Company</Label>
            <Input
              id="c-company"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              placeholder="Company name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-interest">Interest</Label>
            <Input
              id="c-interest"
              value={form.interest}
              onChange={(e) => setForm((f) => ({ ...f, interest: e.target.value }))}
              placeholder="e.g. Cafe in Sydney under $500k"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea
              id="c-notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <ContactTagMultiSelect
              allTags={tags}
              selectedIds={form.tag_ids}
              onChange={(ids) => setForm((f) => ({ ...f, tag_ids: ids }))}
              onTagCreated={(tag) => onTagsChanged([...tags, tag])}
            />
          </div>
          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3">
            <Checkbox
              id="c-consent"
              checked={form.consent_marketing}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, consent_marketing: v === true }))
              }
            />
            <Label htmlFor="c-consent" className="text-xs leading-relaxed">
              Contact has consented to receive marketing communications such as
              listing emails. Required before sending bulk emails.
            </Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
