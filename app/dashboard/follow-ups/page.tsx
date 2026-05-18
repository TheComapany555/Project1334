import { redirect } from "next/navigation";

export default function FollowUpsLegacyRedirect() {
  redirect("/dashboard/contacts/follow-ups");
}
