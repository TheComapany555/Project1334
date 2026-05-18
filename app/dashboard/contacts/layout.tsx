import type { ReactNode } from "react";
import { CrmTabs } from "./crm-tabs";

export default function CrmLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-4">
      <CrmTabs />
      {children}
    </div>
  );
}
