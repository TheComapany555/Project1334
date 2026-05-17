import type { ListingDocument } from "./documents";

export type DocumentFolder = {
  id: string;
  listing_id: string;
  parent_folder_id: string | null;
  name: string;
  description: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DataRoomAccessStatus =
  | "pending"
  | "approved"
  | "denied"
  | "revoked"
  | "expired";

export const DATA_ROOM_ACCESS_STATUS_LABELS: Record<DataRoomAccessStatus, string> = {
  pending: "Pending Approval",
  approved: "Approved",
  denied: "Denied",
  revoked: "Revoked",
  expired: "Expired",
};

export type DataRoomAccessLevel = "all" | "selected";

export const DATA_ROOM_ACCESS_LEVEL_LABELS: Record<DataRoomAccessLevel, string> = {
  all: "All approved files",
  selected: "Selected files & folders only",
};

export type BuyerDataRoomAccess = {
  id: string;
  listing_id: string;
  buyer_id: string;
  status: DataRoomAccessStatus;
  access_level: DataRoomAccessLevel;
  download_allowed: boolean;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  expires_at: string | null;
  expired_at: string | null;
  revoked_at: string | null;
  denial_reason: string | null;
  broker_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BuyerDataRoomPermission = {
  id: string;
  access_id: string;
  folder_id: string | null;
  document_id: string | null;
  granted_at: string;
  granted_by: string | null;
};

export type FolderTreeNode = DocumentFolder & {
  children: FolderTreeNode[];
  documents: ListingDocument[];
};

export type DataRoomAccessWithBuyer = BuyerDataRoomAccess & {
  buyer: {
    id: string;
    full_name: string | null;
    email: string;
  };
  nda_signed_at: string | null;
  granted_folder_ids: string[];
  granted_document_ids: string[];
};
