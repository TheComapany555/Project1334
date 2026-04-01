export type ListingNda = {
  id: string;
  listing_id: string;
  nda_text: string;
  is_required: boolean;
  created_at: string;
  updated_at: string;
};

export type NdaSignature = {
  id: string;
  listing_id: string;
  user_id: string;
  signer_name: string;
  signer_email: string;
  signature_data: string;
  signed_at: string;
  ip_address: string | null;
};

export type NdaSignatureWithListing = NdaSignature & {
  listing?: { id: string; title: string; slug: string } | null;
};
