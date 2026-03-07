"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteBroker } from "@/lib/actions/agencies";
import { Loader2, Mail, Send } from "lucide-react";
import { useRouter } from "next/navigation";

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const result = await inviteBroker(email.trim());
      if (result.ok) {
        toast.success(`Invitation sent to ${email}`);
        setEmail("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="invite-email" className="text-sm font-medium">
          Broker email address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            id="invite-email"
            type="email"
            placeholder="broker@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-9 h-10"
            required
          />
        </div>
      </div>
      <Button type="submit" disabled={loading || !email.trim()} className="h-10">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Send invite
          </>
        )}
      </Button>
    </form>
  );
}
