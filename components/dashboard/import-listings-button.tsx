"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportListingsDialog } from "@/components/dashboard/import-listings-dialog";

export function ImportListingsButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Upload className="size-4" />
        Import
      </Button>
      <ImportListingsDialog
        open={open}
        onOpenChange={setOpen}
        onImported={() => router.refresh()}
      />
    </>
  );
}
