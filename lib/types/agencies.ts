export type AgencyStatus = "pending" | "active" | "disabled";
export type AgencyRole = "owner" | "member";
export type InvitationStatus = "pending" | "accepted" | "expired";

export type Agency = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  bio: string | null;
  social_links: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
  } | null;
  status: AgencyStatus;
  created_at: string;
  updated_at: string;
};

export type AgencyForAdmin = Agency & {
  broker_count: number;
  listing_count: number;
};

export type AgencyBroker = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  photo_url: string | null;
  agency_role: AgencyRole;
  created_at: string;
};

export type AgencyInvitation = {
  id: string;
  agency_id: string;
  email: string;
  token: string;
  status: InvitationStatus;
  invited_by: string | null;
  expires_at: string;
  created_at: string;
};
