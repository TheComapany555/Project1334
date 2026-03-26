import { getSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";
import { getAgencyBrokers, getMyAgency, getPendingInvitations } from "@/lib/actions/agencies";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Users, Clock, Mail } from "lucide-react";
import { InviteForm } from "./invite-form";
import { ResendButton, RevokeButton } from "./invitation-actions";
import { BrokersTable } from "./brokers-table";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function TeamPage() {
  const session = await getSession();
  if (!session?.user?.agencyRole || session.user.agencyRole !== "owner") {
    redirect("/dashboard");
  }

  const [agency, brokers, invitations] = await Promise.all([
    getMyAgency(),
    getAgencyBrokers(),
    getPendingInvitations(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description={`Manage brokers in ${agency?.name ?? "your agency"}. Invite new brokers or remove existing ones.`}
      />

      {/* Invite broker */}
      <Card>
        <CardHeader>
          <CardTitle>Invite a broker</CardTitle>
          <CardDescription>
            Send an invitation email to add a new broker to your agency. They&apos;ll
            create an account and join automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm />
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>
              {invitations.length}{" "}
              {invitations.length === 1 ? "invitation" : "invitations"} awaiting
              acceptance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[140px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  const expired = new Date(inv.expires_at) < new Date();
                  return (
                    <TableRow key={inv.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{inv.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(inv.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span
                            className={
                              expired
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }
                          >
                            {expired ? "Expired" : formatDate(inv.expires_at)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ResendButton invitationId={inv.id} />
                          <RevokeButton invitationId={inv.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Current brokers */}
      <Card>
        <CardHeader>
          <CardTitle>Agency brokers</CardTitle>
          <CardDescription>
            {brokers.length} {brokers.length === 1 ? "broker" : "brokers"} in your agency
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {brokers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">No brokers yet</p>
              <p className="text-sm text-muted-foreground">Use the form above to invite brokers to your agency.</p>
            </div>
          ) : (
            <BrokersTable brokers={brokers} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
