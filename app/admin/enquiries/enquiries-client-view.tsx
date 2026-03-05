"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ENQUIRY_REASON_LABELS } from "@/lib/types/enquiries";
import type { EnquiryWithListingAndBroker } from "@/lib/types/enquiries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/empty-state";
import { EnquiriesTable } from "./enquiries-table";
import { Inbox, Loader2 } from "lucide-react";

const PAGE_SIZE = 20;

const REASON_OPTIONS = Object.entries(ENQUIRY_REASON_LABELS).map(
  ([value, label]) => ({ value, label })
);

type BrokerOption = { value: string; label: string };

type Props = {
  enquiries: EnquiryWithListingAndBroker[];
  brokerOptions: BrokerOption[];
};

export function EnquiriesClientView({ enquiries, brokerOptions }: Props) {
  const [reason, setReason] = useState("");
  const [brokerId, setBrokerId] = useState("");
  const [brokerSearch, setBrokerSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isFiltering, setIsFiltering] = useState(false);
  const filterTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Brief loading flash when filters change
  const triggerFilterAnimation = useCallback(() => {
    setIsFiltering(true);
    clearTimeout(filterTimer.current);
    filterTimer.current = setTimeout(() => setIsFiltering(false), 300);
  }, []);

  useEffect(() => {
    return () => clearTimeout(filterTimer.current);
  }, []);

  // Filter
  const filtered = useMemo(() => {
    let result = enquiries;
    if (reason) {
      result = result.filter((e) => e.reason === reason);
    }
    if (brokerId) {
      result = result.filter((e) => e.broker_id === brokerId);
    }
    return result;
  }, [enquiries, reason, brokerId]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const filteredBrokerOptions = brokerSearch
    ? brokerOptions.filter((o) =>
        o.label.toLowerCase().includes(brokerSearch.toLowerCase())
      )
    : brokerOptions;

  function handleReasonChange(val: string) {
    setReason(val === "all" ? "" : val);
    setPage(1);
    triggerFilterAnimation();
  }

  function handleBrokerChange(val: string | null) {
    setBrokerId(val || "");
    setPage(1);
    triggerFilterAnimation();
  }

  function clearFilters() {
    setReason("");
    setBrokerId("");
    setPage(1);
    triggerFilterAnimation();
  }

  const hasFilters = reason || brokerId;

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="border-b bg-muted/30 px-4 py-4 sm:px-6">
        <div className="space-y-4">
          <div>
            <CardTitle className="text-base">All enquiries</CardTitle>
            <CardDescription className="mt-0.5">
              {total === 0
                ? hasFilters
                  ? "No enquiries match the current filters."
                  : "No enquiries yet."
                : `${total} enquir${total === 1 ? "y" : "ies"}${hasFilters ? " matching filters" : " total"}`}
            </CardDescription>
          </div>

          {/* ── Filters ── */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-4">
            <Select
              value={reason || "all"}
              onValueChange={handleReasonChange}
            >
              <SelectTrigger className="w-[180px]" aria-label="Filter by reason">
                <SelectValue placeholder="All reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reasons</SelectItem>
                {REASON_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Combobox
              value={brokerId}
              onValueChange={(v) => handleBrokerChange(v || null)}
              onInputValueChange={(v, details) => {
                setBrokerSearch(
                  details.reason === "input-change" ? v : ""
                );
              }}
              itemToStringLabel={(v: string) => {
                if (!v) return "All brokers";
                return (
                  brokerOptions.find((o) => o.value === v)?.label ?? v
                );
              }}
            >
              <ComboboxInput placeholder="All brokers" className="w-[200px]" />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxItem value="">All brokers</ComboboxItem>
                  {filteredBrokerOptions.map((opt) => (
                    <ComboboxItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
                {filteredBrokerOptions.length === 0 && (
                  <p className="text-muted-foreground py-2 text-center text-sm">
                    No results found
                  </p>
                )}
              </ComboboxContent>
            </Combobox>

            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative p-4 sm:p-6">
        {/* Filter loading overlay */}
        {isFiltering && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-b-xl">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Filtering…</span>
            </div>
          </div>
        )}
        {paged.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No enquiries"
            description={
              hasFilters
                ? "No enquiries match the current filters. Try changing or clearing the filters."
                : "Enquiries will appear here when buyers contact brokers from listing pages."
            }
          />
        ) : (
          <>
            <EnquiriesTable enquiries={paged} page={safePage} totalPages={totalPages} />

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {safePage} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
