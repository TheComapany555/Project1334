"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportReaxmlDialog } from "@/components/dashboard/import-reaxml-dialog";

export function ImportReaxmlButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <FileCode2 className="size-4" />
        Import REAXML
      </Button>
      <ImportReaxmlDialog
        open={open}
        onOpenChange={setOpen}
        onImported={() => router.refresh()}
      />
    </>
  );
}
