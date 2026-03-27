import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-client";
import { getAgencyBrokers, getMyAgency, getPendingInvitations } from "@/lib/actions/agencies";
import { WorkspaceTabs } from "@/components/dashboard/workspace-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencyBroker, AgencyInvitation } from "@/lib/types/agencies";

function WorkspaceFallback() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-10 w-full max-w-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

export default async function WorkspacePage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/workspace");
  }

  const isOwner = session.user.agencyRole === "owner";
  let teamData: {
    agencyName: string | null;
    brokers: AgencyBroker[];
    invitations: AgencyInvitation[];
  } | null = null;

  if (isOwner) {
    const [agency, brokers, invitations] = await Promise.all([
      getMyAgency(),
      getAgencyBrokers(),
      getPendingInvitations(),
    ]);
    teamData = {
      agencyName: agency?.name ?? null,
      brokers,
      invitations,
    };
  }

  return (
    <Suspense fallback={<WorkspaceFallback />}>
      <WorkspaceTabs isOwner={isOwner} teamData={teamData} />
    </Suspense>
  );
}
