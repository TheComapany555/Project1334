import { getSession } from "@/lib/auth-client";
import { redirect } from "next/navigation";

export default async function TeamPage() {
  const session = await getSession();
  if (!session?.user?.agencyRole || session.user.agencyRole !== "owner") {
    redirect("/dashboard");
  }
  redirect("/dashboard/workspace?tab=team");
}
