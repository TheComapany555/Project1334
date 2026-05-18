"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import type { ListingDocument } from "@/lib/types/documents";

type Props = {
  doc: ListingDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Show the Download button in the header. Hide it when access is preview-only. */
  showDownload?: boolean;
  /** Called when the user clicks Download. Should fire an analytics event + open the file. */
  onDownload?: (doc: ListingDocument) => void;
};

/**
 * Shared in-platform document viewer. Renders the file inside a modal —
 * no new tabs. Handles PDFs (native iframe with toolbar), images (img tag),
 * and Office formats (DOCX, XLSX, PPTX) via Microsoft's free Office Online
 * embed viewer. For unknown types, falls back to a generic iframe and a
 * download option, all still inside the modal.
 *
 * Privacy note: the Office Online viewer fetches the file via the signed
 * URL — Microsoft's servers see the URL (and contents) for rendering. For
 * the broker/seller-broker-listing use case this is acceptable, but we
 * may want to swap to a server-side render-to-PDF down the line if a
 * client raises confidentiality concerns about Microsoft transit.
 */
export function DocumentPreviewModal({
  doc,
  open,
  onOpenChange,
  showDownload = true,
  onDownload,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[90vw] h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="flex items-center justify-between gap-3">
            <span className="truncate">{doc?.name ?? "Document"}</span>
            {doc && showDownload && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDownload?.(doc)}
                className="gap-1"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden bg-muted/40">
          {doc && <PreviewBody doc={doc} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewBody({ doc }: { doc: ListingDocument }) {
  const fileType = (doc.file_type ?? "").toLowerCase();
  const name = doc.name.toLowerCase();
  const isImage =
    fileType.startsWith("image/") ||
    /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name);
  const isPdf = fileType === "application/pdf" || name.endsWith(".pdf");
  const isOfficeDoc = /\.(docx?|xlsx?|pptx?)$/i.test(name);

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={doc.file_url}
        alt={doc.name}
        className="w-full h-full object-contain bg-black/5"
      />
    );
  }

  if (isPdf) {
    return (
      <iframe
        src={`${doc.file_url}#toolbar=1&view=FitH`}
        className="w-full h-full border-0"
        title={doc.name}
      />
    );
  }

  if (isOfficeDoc) {
    // Microsoft's free Office Online embed viewer. Renders DOCX / XLSX /
    // PPTX (and old DOC / XLS / PPT) inside an iframe — no downloads needed.
    const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
      doc.file_url,
    )}`;
    return (
      <iframe
        src={officeUrl}
        className="w-full h-full border-0"
        title={doc.name}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    );
  }

  // Last-ditch fallback for unknown types (CSV, TXT, etc.). Most browsers
  // will render plain-text and CSV inline; binary formats may show a
  // download prompt — but the user stays on Salebiz either way.
  return (
    <div className="flex h-full flex-col">
      <iframe
        src={doc.file_url}
        className="flex-1 border-0 bg-background"
        title={doc.name}
      />
      <div className="border-t border-border bg-muted/30 px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          Some file types don&apos;t preview cleanly in the browser. Use
          Download if the preview is blank.
        </span>
      </div>
    </div>
  );
}
