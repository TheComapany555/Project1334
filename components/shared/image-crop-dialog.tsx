"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Loader2, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { blobToFile, getCroppedImageBlob } from "@/lib/crop-image";

type Props = {
  open: boolean;
  imageSrc: string | null;
  title?: string;
  description?: string;
  /** 1 = square / profile photo, undefined = freeform */
  aspect?: number;
  cropShape?: "round" | "rect";
  fileName?: string;
  onOpenChange: (open: boolean) => void;
  onCropped: (file: File) => void | Promise<void>;
};

export function ImageCropDialog({
  open,
  imageSrc,
  title = "Adjust photo",
  description = "Drag to reposition and use the slider to zoom. Your photo is shown as it will appear on your profile.",
  aspect = 1,
  cropShape = "round",
  fileName = "profile-photo.jpg",
  onOpenChange,
  onCropped,
}: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleSave() {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels, {
        round: cropShape === "round",
        mimeType: "image/jpeg",
        quality: 0.92,
      });
      const file = blobToFile(blob, fileName.replace(/\.\w+$/, ".jpg"));
      await onCropped(file);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative h-72 w-full bg-muted">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={cropShape}
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : null}
        </div>

        <div className="space-y-2 px-6 py-4 border-t border-border">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ZoomIn className="h-3.5 w-3.5" />
            Zoom
          </Label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Zoom"
          />
        </div>

        <DialogFooter className="px-6 pb-6 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !croppedAreaPixels}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save photo"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
