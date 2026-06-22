import Link from "next/link";
import { listAdminAgencies, listAdminBrokers } from "@/lib/actions/admin-brokers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgenciesTable } from "./agencies-table";
import { BrokersTable } from "./brokers-table";
import { CreateAccountDialog } from "./create-account-dialog";
import { DEFAULT_PAGE_SIZE } from "@/lib/types/pagination";
import type { AgencyStatus } from "@/lib/types/agencies";

type SP = { [key: string]: string | string[] | undefined };

function pickStr(v: string | string[] | undefined): string | null {
  if (!v) return null;
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || null;
}

const TABS = [
  { value: "agencies", label: "Agencies", icon: Building2, href: "/admin/brokers" },
  { value: "brokers", label: "Brokers", icon: Users, href: "/admin/brokers?tab=brokers" },
] as const;

export default async function AdminBrokersPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const tab = pickStr(sp.tab) === "brokers" ? "brokers" : "agencies";
  const page = Math.max(1, Number(pickStr(sp.page) ?? 1));
  const pageSize = Math.max(1, Number(pickStr(sp.pageSize) ?? DEFAULT_PAGE_SIZE));
  const q = pickStr(sp.q);
  const status = pickStr(sp.status);

  const tabStrip = (
    <div className="inline-flex items-center rounded-lg border bg-muted/40 p-0.5 text-sm">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = tab === t.value;
        return (
          <Link
            key={t.value}
            href={t.href}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );

  if (tab === "brokers") {
    const result = await listAdminBrokers({ page, pageSize, q, status });
    return (
      <div className="space-y-6">
        <PageHeader
          title="Agencies & Brokers"
          description="Manage agency and broker accounts. Resend set-password links when a broker can't access theirs."
          action={<CreateAccountDialog />}
        />
        {tabStrip}
        <Card>
          <CardHeader>
            <CardTitle>All brokers</CardTitle>
            <CardDescription>
              Every broker across all agencies. Use a broker&apos;s Actions menu to
              resend their set-password link.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <BrokersTable result={result} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const result = await listAdminAgencies({
    page,
    pageSize,
    q,
    status: status as AgencyStatus | null,
  });
  const hasFilters = !!(q || status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agencies & Brokers"
        description="Manage agency accounts. Approve new signups or disable access."
        action={<CreateAccountDialog />}
      />
      {tabStrip}
      <Card>
        <CardHeader>
          <CardTitle>Manage agencies</CardTitle>
          <CardDescription>
            New agencies are pending until you approve. Each agency has an owner and may have multiple brokers.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {result.total === 0 && !hasFilters ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium">No agencies yet</p>
              <p className="text-sm text-muted-foreground">Agencies will appear here once brokers sign up.</p>
            </div>
          ) : (
            <AgenciesTable result={result} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
