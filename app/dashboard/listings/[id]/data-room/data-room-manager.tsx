"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FolderLock, ShieldCheck, Files, Activity, LineChart } from "lucide-react";
import type { ListingDocument } from "@/lib/types/documents";
import type { ListingNda } from "@/lib/types/nda";
import type { DataRoomAccessWithBuyer } from "@/lib/types/data-room";
import type { ListingDataRoomCounts } from "@/lib/actions/data-room";
import { AccessRequestsPanel } from "./access-requests-panel";
import { ActivityPanel } from "./activity-panel";
import { DocumentsPanel } from "./documents-panel";
import { NdaTemplatePanel } from "./nda-template-panel";

type Props = {
  listingId: string;
  listingTitle: string;
  initialTab: string;
  initialNda: ListingNda | null;
  documents: ListingDocument[];
  accessRows: DataRoomAccessWithBuyer[];
  counts: ListingDataRoomCounts;
};

export function DataRoomManager({
  listingId,
  listingTitle,
  initialTab,
  initialNda,
  documents,
  accessRows: initialAccessRows,
  counts: initialCounts,
}: Props) {
  const [tab, setTab] = useState(initialTab);
  const [accessRows, setAccessRows] = useState(initialAccessRows);
  const [counts, setCounts] = useState(initialCounts);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/dashboard/listings`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FolderLock className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Data Room</h1>
          </div>
          <p className="text-sm text-muted-foreground truncate max-w-xl">
            {listingTitle}
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="access" className="gap-2">
            <Activity className="h-4 w-4" />
            Access Requests
            {counts.pending > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {counts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <Files className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <LineChart className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="nda" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            NDA Template
          </TabsTrigger>
        </TabsList>

        <TabsContent value="access" className="mt-6">
          <AccessRequestsPanel
            listingId={listingId}
            documents={documents}
            accessRows={accessRows}
            counts={counts}
            onChange={(nextRows, nextCounts) => {
              setAccessRows(nextRows);
              setCounts(nextCounts);
            }}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentsPanel listingId={listingId} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityPanel listingId={listingId} />
        </TabsContent>

        <TabsContent value="nda" className="mt-6">
          <NdaTemplatePanel
            listingId={listingId}
            initialNda={initialNda}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
