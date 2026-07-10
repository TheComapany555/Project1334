import type { DocumentFolder } from "@/lib/types/data-room";
import type { ListingDocument } from "@/lib/types/documents";

export type FileTreeRow =
  | {
      kind: "folder";
      folder: DocumentFolder;
      depth: number;
      /** Recursive count of files inside this folder and all subfolders. */
      fileCount: number;
      hasChildren: boolean;
    }
  | { kind: "file"; doc: ListingDocument; depth: number };

function bySortOrderThenName<T extends { sort_order: number; name: string }>(
  a: T,
  b: T
): number {
  return a.sort_order - b.sort_order || a.name.localeCompare(b.name);
}

export function childFoldersByParent(
  folders: DocumentFolder[]
): Map<string | null, DocumentFolder[]> {
  const map = new Map<string | null, DocumentFolder[]>();
  for (const folder of folders) {
    const list = map.get(folder.parent_folder_id) ?? [];
    list.push(folder);
    map.set(folder.parent_folder_id, list);
  }
  for (const list of map.values()) list.sort(bySortOrderThenName);
  return map;
}

export function docsByFolder(
  documents: ListingDocument[]
): Map<string | null, ListingDocument[]> {
  const map = new Map<string | null, ListingDocument[]>();
  for (const doc of documents) {
    const list = map.get(doc.folder_id) ?? [];
    list.push(doc);
    map.set(doc.folder_id, list);
  }
  for (const list of map.values()) list.sort(bySortOrderThenName);
  return map;
}

/**
 * Flatten the folder/file hierarchy into visible table rows, depth-first:
 * each folder's subfolders first, then its files; root-level files last.
 * Children of collapsed folders are not emitted.
 */
export function flattenVisibleRows(
  folders: DocumentFolder[],
  documents: ListingDocument[],
  expandedIds: Set<string>
): FileTreeRow[] {
  const foldersByParent = childFoldersByParent(folders);
  const docs = docsByFolder(documents);
  const descendants = getDescendantFileIds(folders, documents);
  const rows: FileTreeRow[] = [];

  const walk = (parentId: string | null, depth: number) => {
    for (const folder of foldersByParent.get(parentId) ?? []) {
      const files = docs.get(folder.id) ?? [];
      const subfolders = foldersByParent.get(folder.id) ?? [];
      rows.push({
        kind: "folder",
        folder,
        depth,
        fileCount: descendants.get(folder.id)?.length ?? 0,
        hasChildren: subfolders.length > 0 || files.length > 0,
      });
      if (expandedIds.has(folder.id)) {
        walk(folder.id, depth + 1);
        for (const doc of files) rows.push({ kind: "file", doc, depth: depth + 1 });
      }
    }
  };

  walk(null, 0);
  for (const doc of docs.get(null) ?? []) rows.push({ kind: "file", doc, depth: 0 });
  return rows;
}

/**
 * Map of folder id → ids of every file in that folder or any of its
 * subfolders. Drives folder checkbox cascade + tri-state derivation.
 */
export function getDescendantFileIds(
  folders: DocumentFolder[],
  documents: ListingDocument[]
): Map<string, string[]> {
  const foldersByParent = childFoldersByParent(folders);
  const docs = docsByFolder(documents);
  const map = new Map<string, string[]>();

  const collect = (folderId: string): string[] => {
    const cached = map.get(folderId);
    if (cached) return cached;
    const ids = (docs.get(folderId) ?? []).map((d) => d.id);
    for (const child of foldersByParent.get(folderId) ?? []) {
      ids.push(...collect(child.id));
    }
    map.set(folderId, ids);
    return ids;
  };

  for (const folder of folders) collect(folder.id);
  return map;
}

/** "Parent / Child" breadcrumb string for a folder (used in search results). */
export function folderPathString(
  folderId: string | null,
  folders: DocumentFolder[]
): string {
  if (!folderId) return "";
  const byId = new Map(folders.map((f) => [f.id, f]));
  const parts: string[] = [];
  let current = byId.get(folderId);
  while (current) {
    parts.unshift(current.name);
    current = current.parent_folder_id
      ? byId.get(current.parent_folder_id)
      : undefined;
  }
  return parts.join(" / ");
}
