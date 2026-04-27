"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  DollarSign,
  Eye,
  FileText,
  Megaphone,
  Users,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Slot = React.ReactNode;

type Props = {
  overview: Slot;
  revenue: Slot;
  listings: Slot;
  engagement: Slot;
  users: Slot;
  marketing: Slot;
};

const TABS = [
  { value: "overview", label: "Overview", icon: BarChart3 },
  { value: "revenue", label: "Revenue", icon: DollarSign },
  { value: "listings", label: "Listings", icon: FileText },
  { value: "engagement", label: "Engagement", icon: Eye },
  { value: "users", label: "Users", icon: Users },
  { value: "marketing", label: "Marketing", icon: Megaphone },
] as const;

type TabValue = (typeof TABS)[number]["value"];
const VALID = TABS.map((t) => t.value) as readonly string[];

function isTab(v: string | null): v is TabValue {
  return !!v && VALID.includes(v);
}

export function AnalyticsTabs({
  overview,
  revenue,
  listings,
  engagement,
  users,
  marketing,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const param = searchParams.get("tab");
  const tab: TabValue = isTab(param) ? param : "overview";

  function setTab(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const slots: Record<TabValue, Slot> = {
    overview,
    revenue,
    listings,
    engagement,
    users,
    marketing,
  };

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full gap-6">
      <div className="overflow-x-auto -mx-2 px-2">
        <TabsList className="h-10 bg-muted/40 p-1 inline-flex w-auto min-w-full gap-0.5">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="gap-1.5 px-3 cursor-pointer data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {TABS.map(({ value }) => (
        <TabsContent key={value} value={value} className="mt-0 space-y-6">
          {slots[value]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
