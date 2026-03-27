"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileSettings } from "@/components/dashboard/profile-settings";
import { AgencySettings } from "@/components/dashboard/agency-settings";
import { TeamManagementView } from "@/components/dashboard/team-management-view";
import type { AgencyBroker, AgencyInvitation } from "@/lib/types/agencies";

type TabValue = "profile" | "agency" | "team";

function parseTab(raw: string | null, isOwner: boolean): TabValue {
  if (!isOwner) return "profile";
  if (raw === "agency") return "agency";
  if (raw === "team") return "team";
  return "profile";
}

export function WorkspaceTabs({
  isOwner,
  teamData,
}: {
  isOwner: boolean;
  teamData: {
    agencyName: string | null;
    brokers: AgencyBroker[];
    invitations: AgencyInvitation[];
  } | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabFromUrl = parseTab(searchParams.get("tab"), isOwner);

  const setTab = React.useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "profile") {
        params.delete("tab");
      } else {
        params.set("tab", value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  if (!isOwner) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>
          <p className="text-sm text-muted-foreground">
            Manage your public broker profile and contact information.
          </p>
        </div>
        <ProfileSettings embedded />
      </div>
    );
  }

  if (!teamData) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Manage your broker profile, agency details, and team.
        </p>
      </div>

      <Tabs value={tabFromUrl} onValueChange={setTab} className="w-full">
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="agency">Agency</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>
        {/* Render one panel at a time so profile/agency forms do not duplicate field ids in the DOM */}
        <div className="pt-6">
          {tabFromUrl === "profile" && <ProfileSettings embedded />}
          {tabFromUrl === "agency" && <AgencySettings embedded />}
          {tabFromUrl === "team" && (
            <TeamManagementView
              embedded
              agencyName={teamData.agencyName}
              brokers={teamData.brokers}
              invitations={teamData.invitations}
            />
          )}
        </div>
      </Tabs>
    </div>
  );
}
