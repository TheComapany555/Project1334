"use client";

import { FilterBar, FilterBarSelect, FilterBarCombobox, FilterBarClear } from "@/components/admin/filter-bar";
import { ENQUIRY_REASON_LABELS } from "@/lib/types/enquiries";

const REASON_OPTIONS = Object.entries(ENQUIRY_REASON_LABELS).map(([value, label]) => ({
  value,
  label,
}));

type BrokerOption = { value: string; label: string };

type Props = { brokerOptions: BrokerOption[] };

export function EnquiriesFilterBar({ brokerOptions }: Props) {
  return (
    <FilterBar>
      <FilterBarSelect
        paramName="reason"
        placeholder="All reasons"
        options={REASON_OPTIONS}
      />
      <FilterBarCombobox
        paramName="broker_id"
        placeholder="All brokers"
        options={brokerOptions}
      />
      <FilterBarClear />
    </FilterBar>
  );
}
