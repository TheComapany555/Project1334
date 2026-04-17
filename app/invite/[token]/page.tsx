import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInviteByToken } from "@/lib/actions/share-invites";
import { InviteLandingView } from "./invite-landing-view";
import { InviteExpiredView } from "./invite-expired-view";

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return <InviteExpiredView reason="not_found" />;
  }
  if (invite.expired) {
    return <InviteExpiredView reason="expired" />;
  }

  // A stale next-auth cookie can throw a decryption error on this public page.
  // Treat any failure as "not logged in" so the invite flow stays usable.
  const session = await getServerSession(authOptions).catch(() => null);
  const sessionEmail = session?.user?.email?.toLowerCase() ?? null;

  // Already-signed shortcut: if the recipient is logged in, has signed the
  // NDA (or none required), and the invite is consumed by them, just open
  // the listing. Otherwise the landing view handles the rest.
  if (
    invite.consumed &&
    sessionEmail === invite.recipientEmail &&
    (invite.ndaAlreadySigned || !invite.ndaRequired)
  ) {
    redirect(`/listing/${invite.listing.slug}`);
  }

  return (
    <InviteLandingView
      invite={invite}
      isLoggedIn={!!session?.user?.id}
      loggedInEmail={sessionEmail}
    />
  );
}
