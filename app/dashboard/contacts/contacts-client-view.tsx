"use client";

import { useState, useTransition } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Send,
  Trash2,
  Mail,
  Phone,
  Building2,
  Users,
  Loader2,
} from "lucide-react";
import { addContact, deleteContact, sendListingToContact, type BrokerContact } from "@/lib/actions/contacts";
import { useRouter } from "next/navigation";

type Props = {
  contacts: BrokerContact[];
  listings: { id: string; title: string }[];
};

export function ContactsClientView({ contacts, listings }: Props) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Add contact form
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", notes: "" });
  const [formError, setFormError] = useState("");

  // Send listing form
  const [selectedListing, setSelectedListing] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleAdd() {
    setFormError("");
    if (!form.email.trim()) {
      setFormError("Email is required");
      return;
    }
    const res = await addContact(form);
    if (!res.ok) {
      setFormError(res.error ?? "Failed to add contact");
      return;
    }
    setForm({ name: "", email: "", phone: "", company: "", notes: "" });
    setAddOpen(false);
    startTransition(() => router.refresh());
  }

  async function handleDelete(id: string) {
    await deleteContact(id);
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 px-4 py-4 sm:px-6">
          <div className="space-y-0.5">
            <CardTitle className="text-base">All contacts</CardTitle>
            <CardDescription>
              {contacts.length === 0
                ? "No contacts yet. Save enquiries or add contacts manually."
                : `${contacts.length} contact${contacts.length === 1 ? "" : "s"}`}
            </CardDescription>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Contact</DialogTitle>
                <DialogDescription>Add a new contact to your list.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div>
                  <Label htmlFor="c-name">Name</Label>
                  <Input id="c-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="John Smith" />
                </div>
                <div>
                  <Label htmlFor="c-email">Email *</Label>
                  <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
                </div>
                <div>
                  <Label htmlFor="c-phone">Phone</Label>
                  <Input id="c-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="04XX XXX XXX" />
                </div>
                <div>
                  <Label htmlFor="c-company">Company</Label>
                  <Input id="c-company" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder="Company name" />
                </div>
                <div>
                  <Label htmlFor="c-notes">Notes</Label>
                  <Input id="c-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
                </div>
                {formError && <p className="text-sm text-destructive">{formError}</p>}
              </div>
              <DialogFooter>
                <Button onClick={handleAdd}>Save Contact</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent className="p-0">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
              <div className="rounded-full bg-muted p-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-1 max-w-xs">
                <p className="font-medium">No contacts yet</p>
                <p className="text-sm text-muted-foreground">
                  Save contacts from enquiries or add them manually to build your contact list.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-4 py-3.5 sm:px-6">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {(c.name ?? c.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name || c.email}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
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
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3" />
                          {c.company}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {c.source === "enquiry" ? "From enquiry" : "Manual"}
                  </Badge>
                  <div className="flex items-center gap-1 shrink-0">
                    {listings.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-xs"
                        onClick={() => { setSendOpen(c.id); setSendStatus("idle"); setSelectedListing(""); }}
                      >
                        <Send className="h-3.5 w-3.5" />
                        Send listing
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send listing dialog */}
      <Dialog open={!!sendOpen} onOpenChange={(open) => { if (!open) setSendOpen(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Listing</DialogTitle>
            <DialogDescription>
              Choose a listing to email to this contact.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Select listing</Label>
            <Select value={selectedListing} onValueChange={setSelectedListing}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a listing..." />
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
              <p className="text-sm text-primary font-medium">Sent successfully!</p>
            ) : (
              <Button onClick={handleSend} disabled={!selectedListing || sendStatus === "sending"}>
                {sendStatus === "sending" && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                {sendStatus === "error" ? "Retry" : "Send Email"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
