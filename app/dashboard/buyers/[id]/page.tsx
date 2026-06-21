import { notFound, redirect } from "next/navigation";
import {
  getBuyerProfile,
  getBuyerPanelByContactId,
  type BuyerProfile,
} from "@/lib/actions/buyer-profile";
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

  let profile: BuyerProfile | null = null;
  try {
    // First treat `id` as a Salebiz user id (a registered buyer).
    profile = await getBuyerProfile(id, { listingId: listingId ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("unauthor")) redirect("/auth/login");
    if (!(msg.includes("forbidden") || msg.includes("not found"))) throw err;

    // `id` isn't a resolvable user — it may be a CRM contact id, e.g. a
    // manually-added contact who hasn't registered. Fall back to the contact
    // view so "View full profile" shows the no-account state + invite button
    // rather than a 404. (If the contact is linked to an account, this
    // delegates back to the full profile.)
    try {
      profile = await getBuyerPanelByContactId(id);
    } catch (err2) {
      const msg2 = err2 instanceof Error ? err2.message.toLowerCase() : "";
      if (msg2.includes("unauthor")) redirect("/auth/login");
      profile = null;
    }
  }

  if (!profile) notFound();

  return <BuyerProfileView profile={profile} />;
}
