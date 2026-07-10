import {
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FileVisual = { Icon: LucideIcon; colorClass: string };

const DEFAULT_VISUAL: FileVisual = {
  Icon: File,
  colorClass: "text-muted-foreground",
};

const VISUALS: Array<{ test: RegExp; visual: FileVisual }> = [
  {
    test: /pdf/,
    visual: { Icon: FileText, colorClass: "text-red-500 dark:text-red-400" },
  },
  {
    test: /msword|wordprocessingml|\bdocx?\b/,
    visual: { Icon: FileText, colorClass: "text-blue-500 dark:text-blue-400" },
  },
  {
    test: /spreadsheetml|ms-excel|\bxlsx?\b|csv/,
    visual: {
      Icon: FileSpreadsheet,
      colorClass: "text-emerald-600 dark:text-emerald-400",
    },
  },
  {
    test: /image|\b(png|jpe?g|gif|webp|svg|heic)\b/,
    visual: {
      Icon: FileImage,
      colorClass: "text-purple-500 dark:text-purple-400",
    },
  },
  {
    test: /zip|compressed|\b(rar|7z|tar|gz)\b/,
    visual: {
      Icon: FileArchive,
      colorClass: "text-amber-600 dark:text-amber-400",
    },
  },
];

export function getFileVisual(
  name: string,
  mimeType?: string | null
): FileVisual {
  const extension = name.includes(".")
    ? name.split(".").pop()!.toLowerCase()
    : "";
  const haystack = `${mimeType?.toLowerCase() ?? ""} ${extension}`;
  return VISUALS.find(({ test }) => test.test(haystack))?.visual ?? DEFAULT_VISUAL;
}

export function FileIcon({
  name,
  mimeType,
  className,
}: {
  name: string;
  mimeType?: string | null;
  className?: string;
}) {
  const { Icon, colorClass } = getFileVisual(name, mimeType);
  return (
    <Icon className={cn("size-4 shrink-0", colorClass, className)} aria-hidden />
  );
}
