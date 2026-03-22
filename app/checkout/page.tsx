import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { CheckoutPage } from "./checkout-page";

type Props = {
  searchParams: Promise<{ listing?: string; product?: string; type?: string }>;
};

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const listingId = params.listing;
  const productId = params.product;
  const paymentType = (params.type === "listing_tier" ? "listing_tier" : "featured") as
    | "featured"
    | "listing_tier";

  if (!listingId || !productId) {
    redirect("/dashboard/listings");
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    redirect("/auth/login");
  }

  const supabase = createServiceRoleClient();
  const userId = session.user.id;
  const agencyId = session.user.agencyId ?? null;
  const agencyRole = session.user.agencyRole ?? null;

  // Fetch product
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("status", "active")
    .single();

  if (!product) {
    redirect("/dashboard/listings?error=product-not-found");
  }

  // Verify listing ownership
  let query = supabase
    .from("listings")
    .select("id, title, slug, broker_id, agency_id")
    .eq("id", listingId);

  if (agencyId && agencyRole === "owner") {
    query = query.eq("agency_id", agencyId);
  } else {
    query = query.eq("broker_id", userId);
  }

  const { data: listing } = await query.single();
  if (!listing) {
    redirect("/dashboard/listings?error=listing-not-found");
  }

  return (
    <CheckoutPage
      listing={{ id: listing.id, title: listing.title, slug: listing.slug }}
      product={product}
      paymentType={paymentType}
    />
  );
}
