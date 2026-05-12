import { redirect } from "next/navigation";

/**
 * `/dashboard/profile` is just an alias for the Profile tab of the workspace.
 * We forward query string through so OAuth callbacks (?connected=gmail or
 * ?connect_error=...) still land on the right tab with the param intact.
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams({ tab: "profile" });
  for (const [key, value] of Object.entries(sp)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.set(key, value);
    }
  }
  redirect(`/dashboard/workspace?${params.toString()}`);
}
