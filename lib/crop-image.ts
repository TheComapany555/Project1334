import type { Area } from "react-easy-crop";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

async function getCroppedCanvas(
  imageSrc: string,
  pixelCrop: Area,
  round: boolean,
): Promise<HTMLCanvasElement> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  if (round) {
    const rounded = document.createElement("canvas");
    rounded.width = pixelCrop.width;
    rounded.height = pixelCrop.height;
    const roundedCtx = rounded.getContext("2d");
    if (!roundedCtx) throw new Error("Could not get canvas context");

    roundedCtx.beginPath();
    roundedCtx.arc(
      pixelCrop.width / 2,
      pixelCrop.height / 2,
      Math.min(pixelCrop.width, pixelCrop.height) / 2,
      0,
      Math.PI * 2,
    );
    roundedCtx.closePath();
    roundedCtx.clip();
    roundedCtx.drawImage(canvas, 0, 0);
    return rounded;
  }

  return canvas;
}

/** Crop an image to a blob suitable for upload. */
export async function getCroppedImageBlob(
  imageSrc: string,
  pixelCrop: Area,
  opts?: { round?: boolean; mimeType?: string; quality?: number },
): Promise<Blob> {
  const canvas = await getCroppedCanvas(
    imageSrc,
    pixelCrop,
    opts?.round ?? false,
  );
  const mimeType = opts?.mimeType ?? "image/jpeg";
  const quality = opts?.quality ?? 0.92;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to crop image"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

export function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type });
}
