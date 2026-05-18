import { redirect } from "next/navigation";

export default function ActivityLegacyRedirect() {
  redirect("/dashboard/contacts/activity");
}
