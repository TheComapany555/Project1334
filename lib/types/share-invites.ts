export type InvitePublicData = {
  token: string;
  recipientEmail: string;
  recipientName: string | null;
  customMessage: string | null;
  expired: boolean;
  consumed: boolean;
  alreadyAccountUserId: string | null;
  ndaRequired: boolean;
  ndaText: string | null;
  ndaAlreadySigned: boolean;
  listing: {
    id: string;
    title: string;
    slug: string;
    location_text: string | null;
    summary: string | null;
    asking_price: number | null;
    price_type: string;
  };
  broker: {
    name: string | null;
    company: string | null;
    photoUrl: string | null;
    slug: string | null;
  };
};

export type CreateInviteResult =
  | { ok: true; inviteId: string; url: string }
  | { ok: false; error: string };

export type AcceptInviteResult =
  | { ok: true; listingSlug: string; createdAccount: boolean; email: string }
  | { ok: false; error: string };
