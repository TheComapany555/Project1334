"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity, Download, Eye, FileText } from "lucide-react";
import {
  getListingDataRoomActivity,
  type DataRoomActivitySummary,
} from "@/lib/actions/data-room";

type Props = {
  listingId: string;
};

export function ActivityPanel({ listingId }: Props) {
  const [data, setData] = useState<DataRoomActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const result = await getListingDataRoomActivity(listingId);
      setData(result);
      setLoading(false);
    })();
  }, [listingId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading activity…
        </CardContent>
      </Card>
    );
  }
  if (!data || data.recent.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-2">
          <Activity className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No vault activity yet. As approved buyers view or download files
            their actions will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="buyers">
        <TabsList>
          <TabsTrigger value="buyers">By buyer ({data.perBuyer.length})</TabsTrigger>
          <TabsTrigger value="documents">
            By document ({data.perDocument.length})
          </TabsTrigger>
          <TabsTrigger value="recent">Recent events</TabsTrigger>
        </TabsList>

        <TabsContent value="buyers" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Buyer</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Downloads</TableHead>
                  <TableHead className="text-right">Files seen</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.perBuyer.map((row) => (
                  <TableRow key={row.buyer_id}>
                    <TableCell>
                      <div className="text-sm font-medium">
                        {row.buyer_name ?? row.buyer_email}
                      </div>
                      {row.buyer_name && (
                        <div className="text-xs text-muted-foreground">
                          {row.buyer_email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">{row.views}</TableCell>
                    <TableCell className="text-right text-sm">
                      {row.downloads}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.distinct_documents}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.last_activity_at && formatDateTime(row.last_activity_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Downloads</TableHead>
                  <TableHead className="text-right">Buyers</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.perDocument.map((row) => (
                  <TableRow key={row.document_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {row.document_name ?? "(deleted)"}
                        </span>
                      </div>
                      {row.folder_path && (
                        <div className="text-[10px] text-muted-foreground">
                          {row.folder_path}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">{row.views}</TableCell>
                    <TableCell className="text-right text-sm">
                      {row.downloads}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.distinct_buyers}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.last_activity_at && formatDateTime(row.last_activity_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="mt-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recent.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(ev.occurred_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {ev.buyer_name ?? ev.buyer_email ?? "(unknown)"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{ev.document_name ?? "(deleted)"}</div>
                      {ev.folder_path && (
                        <div className="text-[10px] text-muted-foreground">
                          {ev.folder_path}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="text-[10px] gap-1"
                      >
                        {ev.event_kind === "view" ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        {ev.event_kind === "view" ? "Viewed" : "Downloaded"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatDateTime(value: string): string {
  try {
    const d = new Date(value);
    return d.toLocaleString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}
