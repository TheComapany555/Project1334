"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAgencyByAdmin,
  createBrokerByAdmin,
  listAgenciesForPicker,
} from "@/lib/actions/admin-account-creation";
import { Loader2, UserPlus, Building2, User } from "lucide-react";

const agencySchema = z.object({
  agencyName: z.string().min(1, "Agency name is required").max(120),
  ownerName: z.string().min(1, "Owner name is required").max(100),
  email: z.string().email("Enter a valid email"),
});

const brokerSchema = z.object({
  agencyId: z.string().min(1, "Choose an agency"),
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Enter a valid email"),
  agencyRole: z.enum(["member", "owner"]),
});

type AgencyForm = z.infer<typeof agencySchema>;
type BrokerForm = z.infer<typeof brokerSchema>;

export function CreateAccountDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"agency" | "broker">("agency");
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);

  const agencyForm = useForm<AgencyForm>({
    resolver: zodResolver(agencySchema),
    defaultValues: { agencyName: "", ownerName: "", email: "" },
  });
  const brokerForm = useForm<BrokerForm>({
    resolver: zodResolver(brokerSchema),
    defaultValues: { agencyId: "", name: "", email: "", agencyRole: "member" },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && agencies.length === 0 && !agenciesLoading) {
      setAgenciesLoading(true);
      listAgenciesForPicker()
        .then((rows) => setAgencies(rows.map((r) => ({ id: r.id, name: r.name }))))
        .finally(() => setAgenciesLoading(false));
    }
  }

  async function onAgencySubmit(data: AgencyForm) {
    const result = await createAgencyByAdmin({
      email: data.email,
      ownerName: data.ownerName,
      agencyName: data.agencyName,
    });
    if (result.ok) {
      if (result.emailSent) {
        toast.success("Agency created. A Set Password email has been sent to the owner.");
      } else {
        toast.warning(result.warning ?? "Agency created, but the Set Password email failed to send.");
      }
      agencyForm.reset();
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function onBrokerSubmit(data: BrokerForm) {
    const result = await createBrokerByAdmin({
      email: data.email,
      name: data.name,
      agencyId: data.agencyId,
      agencyRole: data.agencyRole,
    });
    if (result.ok) {
      if (result.emailSent) {
        toast.success("Broker created. A Set Password email has been sent.");
      } else {
        toast.warning(result.warning ?? "Broker created, but the Set Password email failed to send.");
      }
      brokerForm.reset();
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-1.5" />
          Create account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create account</DialogTitle>
          <DialogDescription>
            Skip the email verification step. The user will receive a link to set their password.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "agency" | "broker")} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="agency" className="flex-1">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              New agency
            </TabsTrigger>
            <TabsTrigger value="broker" className="flex-1">
              <User className="h-3.5 w-3.5 mr-1.5" />
              Broker (existing agency)
            </TabsTrigger>
          </TabsList>

          {/* ── Create Agency tab ── */}
          <TabsContent value="agency" className="mt-4">
            <form onSubmit={agencyForm.handleSubmit(onAgencySubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="agency-name">Agency name</Label>
                <Input
                  id="agency-name"
                  placeholder="Acme Business Brokers"
                  {...agencyForm.register("agencyName")}
                />
                {agencyForm.formState.errors.agencyName && (
                  <p className="text-xs text-destructive">
                    {agencyForm.formState.errors.agencyName.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="owner-name">Owner name</Label>
                <Input
                  id="owner-name"
                  placeholder="Jane Smith"
                  {...agencyForm.register("ownerName")}
                />
                {agencyForm.formState.errors.ownerName && (
                  <p className="text-xs text-destructive">
                    {agencyForm.formState.errors.ownerName.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agency-email">Owner email</Label>
                <Input
                  id="agency-email"
                  type="email"
                  placeholder="jane@example.com"
                  autoComplete="off"
                  {...agencyForm.register("email")}
                />
                {agencyForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {agencyForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={agencyForm.formState.isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={agencyForm.formState.isSubmitting}>
                  {agencyForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Create agency"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* ── Create Broker tab ── */}
          <TabsContent value="broker" className="mt-4">
            <form onSubmit={brokerForm.handleSubmit(onBrokerSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="broker-agency">Agency</Label>
                <Controller
                  control={brokerForm.control}
                  name="agencyId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={agenciesLoading}
                    >
                      <SelectTrigger id="broker-agency" className="w-full">
                        <SelectValue placeholder={agenciesLoading ? "Loading agencies…" : "Choose an agency"} />
                      </SelectTrigger>
                      <SelectContent>
                        {agencies.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {brokerForm.formState.errors.agencyId && (
                  <p className="text-xs text-destructive">
                    {brokerForm.formState.errors.agencyId.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="broker-name">Broker name</Label>
                <Input
                  id="broker-name"
                  placeholder="John Doe"
                  {...brokerForm.register("name")}
                />
                {brokerForm.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {brokerForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="broker-email">Email</Label>
                <Input
                  id="broker-email"
                  type="email"
                  placeholder="john@example.com"
                  autoComplete="off"
                  {...brokerForm.register("email")}
                />
                {brokerForm.formState.errors.email && (
                  <p className="text-xs text-destructive">
                    {brokerForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="broker-role">Role within agency</Label>
                <Controller
                  control={brokerForm.control}
                  name="agencyRole"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="broker-role" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={brokerForm.formState.isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={brokerForm.formState.isSubmitting}>
                  {brokerForm.formState.isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Create broker"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
