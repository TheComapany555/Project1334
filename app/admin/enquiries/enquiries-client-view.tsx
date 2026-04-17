"use client";

import { useMemo, useState } from "react";
import type { EnquiryWithListingAndBroker } from "@/lib/types/enquiries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox";
import { EnquiriesTable } from "./enquiries-table";

type BrokerOption = { value: string; label: string };

type Props = {
  enquiries: EnquiryWithListingAndBroker[];
  brokerOptions: BrokerOption[];
};

export function EnquiriesClientView({ enquiries, brokerOptions }: Props) {
  const [brokerId, setBrokerId] = useState("");
  const [brokerSearch, setBrokerSearch] = useState("");

  const filtered = useMemo(
    () => (brokerId ? enquiries.filter((e) => e.broker_id === brokerId) : enquiries),
    [enquiries, brokerId]
  );

  const filteredBrokerOptions = brokerSearch
    ? brokerOptions.filter((o) =>
        o.label.toLowerCase().includes(brokerSearch.toLowerCase())
      )
    : brokerOptions;

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="border-b bg-muted/30 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-base">All enquiries</CardTitle>
            <CardDescription className="mt-0.5">
              Use search and filters below to narrow results.
            </CardDescription>
          </div>
          <Combobox
            value={brokerId}
            onValueChange={(v) => setBrokerId(v || "")}
            onInputValueChange={(v, details) => {
              setBrokerSearch(details.reason === "input-change" ? v : "");
            }}
            itemToStringLabel={(v: string) => {
              if (!v) return "All brokers";
              return brokerOptions.find((o) => o.value === v)?.label ?? v;
            }}
          >
            <ComboboxInput placeholder="All brokers" className="w-[220px]" />
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
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6">
        <EnquiriesTable enquiries={filtered} />
      </CardContent>
    </Card>
  );
}
