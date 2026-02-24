import { getSession } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminPage() {
  const session = await getSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-muted-foreground">
          Signed in as {session?.user?.email} (admin).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>
            Manage brokers, listings, categories, and enquiries. Full admin features in later milestones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Milestone 1 complete. Brokers, listings, and categories management in Milestone 6.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
