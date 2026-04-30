import { notFound, redirect } from "next/navigation";
import { getBuyerProfile } from "@/lib/actions/buyer-profile";
import { BuyerProfileView } from "@/components/dashboard/buyer-profile-view";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ listingId?: string }>;
};

export default async function BuyerProfilePage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const { listingId } = await searchParams;

  let profile;
  try {
    profile = await getBuyerProfile(id, { listingId: listingId ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("unauthor")) redirect("/auth/login");
    if (msg.includes("forbidden") || msg.includes("not found")) notFound();
    throw err;
  }

  return <BuyerProfileView profile={profile} />;
}
