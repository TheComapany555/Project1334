import { getBrokerAnalytics } from "@/lib/actions/analytics";
import { getSession } from "@/lib/auth-client";
import { AnalyticsDashboard } from "./analytics-dashboard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const [data, session] = await Promise.all([
    getBrokerAnalytics(30),
    getSession(),
  ]);
  // Cover-page label: agency name when the broker is an agency owner,
  // otherwise the broker's own session name.
  const isAgencyOwner =
    session?.user?.agencyRole === "owner" && !!session.user.agencyName;
  const ownerLabel =
    isAgencyOwner
      ? session?.user?.agencyName ?? session?.user?.name ?? "Broker"
      : session?.user?.name ?? session?.user?.email ?? "Broker";
  const ownerSubLabel =
    !isAgencyOwner && session?.user?.agencyName
      ? session.user.agencyName
      : undefined;
  return (
    <AnalyticsDashboard
      initialData={data}
      ownerLabel={ownerLabel}
      ownerSubLabel={ownerSubLabel}
    />
  );
}
