"use client";

import { useRef } from "react";
import { Loader2, Paperclip, Send, Share2, ShieldQuestion, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MessageAttachment, MessageRole } from "@/lib/actions/messages";

const FILE_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv";

type Props = {
  viewerRole: MessageRole;
  counterpartyName: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isSending: boolean;
  isUploading: boolean;
  pendingAttachments: MessageAttachment[];
  onRemoveAttachment: (index: number) => void;
  onFilesPicked: (files: FileList | null) => void;
  onSendListing?: () => void;
  onRequestNda?: () => void;
  canRequestNda?: boolean;
  isRequestingNda?: boolean;
};

export function MessageComposer({
  viewerRole,
  counterpartyName,
  draft,
  onDraftChange,
  onSend,
  onKeyDown,
  isSending,
  isUploading,
  pendingAttachments,
  onRemoveAttachment,
  onFilesPicked,
  onSendListing,
  onRequestNda,
  canRequestNda = true,
  isRequestingNda = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canSend =
    !isSending &&
    !isUploading &&
    (draft.trim().length > 0 || pendingAttachments.length > 0);

  return (
    <div className="shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {viewerRole === "broker" && (onSendListing || onRequestNda) && (
        <ButtonGroup className="mb-3">
          {onSendListing && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onSendListing}
            >
              <Share2 className="size-3.5" />
              Send listing
            </Button>
          )}
          {onRequestNda && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onRequestNda}
              disabled={!canRequestNda || isRequestingNda}
            >
              {isRequestingNda ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ShieldQuestion className="size-3.5" />
              )}
              Request NDA
            </Button>
          )}
        </ButtonGroup>
      )}

      {pendingAttachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {pendingAttachments.map((a, i) => (
            <Badge
              key={`${a.name}-${i}`}
              variant="outline"
              className="gap-1.5 py-1 pr-1 pl-2 font-normal"
            >
              <Paperclip className="size-3 text-muted-foreground" />
              <span className="max-w-[140px] truncate text-xs">{a.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {fmtBytes(a.size)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveAttachment(i)}
                className="ml-0.5 rounded-sm p-0.5 hover:bg-muted"
                aria-label={`Remove ${a.name}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        accept={FILE_ACCEPT}
        onChange={(e) => {
          onFilesPicked(e.target.files);
          // Reset so picking the same file again still fires onChange — without
          // this, re-attaching the same document after removing it from the
          // tray silently fails.
          e.target.value = "";
        }}
      />

      <TooltipProvider delayDuration={300}>
        <InputGroup
          className={cn(
            "min-h-[52px] has-[>textarea]:h-auto",
            isSending && "opacity-80",
          )}
        >
          <InputGroupAddon align="inline-start" className="self-end pb-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <InputGroupButton
                  size="icon-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isSending}
                  aria-label="Attach file"
                >
                  {isUploading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Paperclip />
                  )}
                </InputGroupButton>
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>
          </InputGroupAddon>

          <InputGroupTextarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Message ${counterpartyName}…`}
            rows={1}
            disabled={isSending}
            className="min-h-[44px] max-h-32 py-3 text-sm field-sizing-content"
          />

          <InputGroupAddon align="inline-end" className="self-end pb-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <InputGroupButton
                  size="icon-sm"
                  variant="default"
                  onClick={onSend}
                  disabled={!canSend}
                  aria-label="Send message"
                  className="rounded-full"
                >
                  {isSending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Send />
                  )}
                </InputGroupButton>
              </TooltipTrigger>
              <TooltipContent>Send message</TooltipContent>
            </Tooltip>
          </InputGroupAddon>

        </InputGroup>
      </TooltipProvider>
    </div>
  );
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
