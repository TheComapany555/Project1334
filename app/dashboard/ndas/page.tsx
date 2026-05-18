import { redirect } from "next/navigation";

export default function NdasLegacyRedirect() {
  redirect("/dashboard/contacts/ndas");
}
