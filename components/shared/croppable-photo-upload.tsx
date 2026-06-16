"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImageCropDialog } from "@/components/shared/image-crop-dialog";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

type Props = {
  id: string;
  label: string;
  url: string | null;
  uploading: boolean;
  onUpload: (file: File) => void | Promise<void>;
  disabled?: boolean;
};

export function CroppablePhotoUpload({
  id,
  label,
  url,
  uploading,
  onUpload,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState("profile-photo.jpg");

  function resetInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      toast.error("Image must be 5MB or smaller.");
      resetInput();
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPendingName(file.name || "profile-photo.jpg");
    setCropSrc(objectUrl);
    setCropOpen(true);
  }

  function handleDialogChange(open: boolean) {
    setCropOpen(open);
    if (!open) {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
      resetInput();
    }
  }

  async function handleCropped(file: File) {
    await onUpload(file);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    resetInput();
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-24 w-24 rounded-full border-2 border-border bg-muted overflow-hidden group">
          {url ? (
            <Image
              src={url}
              alt={label}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Camera className="h-7 w-7 text-muted-foreground/30" />
            </div>
          )}
          <label
            htmlFor={id}
            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
          >
            <Camera className="h-5 w-5 text-white" />
          </label>
        </div>
        <div className="text-center">
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Drag and zoom to frame your face
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            id={id}
            onChange={onFileChange}
            disabled={uploading || disabled}
          />
          <label htmlFor={id}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1.5 h-7 text-xs cursor-pointer"
              disabled={uploading || disabled}
              asChild
            >
              <span>
                {uploading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  "Change"
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>

      <ImageCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        fileName={pendingName}
        onOpenChange={handleDialogChange}
        onCropped={handleCropped}
      />
    </>
  );
}
