import { PageHeader } from "@/components/admin/page-header";
import { getAgentboxConnection } from "@/lib/actions/agentbox";
import { AgentboxConnectCard } from "@/components/dashboard/agentbox-connect-card";

export const metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  const view = await getAgentboxConnection();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Integrations"
        description="Connect external platforms to bring your listings into SaleBiz automatically."
      />
      <AgentboxConnectCard initialView={view} />
    </div>
  );
}
