import { redirect } from "next/navigation";

export default function AgencyPage() {
  redirect("/dashboard/workspace?tab=agency");
}
