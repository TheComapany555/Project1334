export type DocumentCategory =
  | "profit_loss"
  | "lease_agreement"
  | "equipment_list"
  | "tax_return"
  | "financial_statement"
  | "other";

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  profit_loss: "Profit & Loss",
  lease_agreement: "Lease Agreement",
  equipment_list: "Equipment List",
  tax_return: "Tax Return",
  financial_statement: "Financial Statement",
  other: "Other",
};

export type DocumentApprovalStatus = "pending" | "approved" | "rejected";

export const DOCUMENT_APPROVAL_LABELS: Record<DocumentApprovalStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};

export type ListingDocument = {
  id: string;
  listing_id: string;
  name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  category: DocumentCategory;
  is_confidential: boolean;
  sort_order: number;
  uploaded_by: string | null;
  created_at: string;
  approval_status: DocumentApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  /** Buyer signed NDA but broker has not approved document access yet */
  buyer_access_pending?: boolean;
};
