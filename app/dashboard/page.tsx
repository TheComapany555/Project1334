import Link from "next/link";
import { getSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await getSession();
  const name = session?.user?.name ?? session?.user?.email ?? "Broker";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {name}.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="transition-colors hover:bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>Update your broker profile and public page</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
              <Link href="/dashboard/profile">Edit profile</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="transition-colors hover:bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Listings</CardTitle>
            <CardDescription>Create and manage your business listings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href="/dashboard/listings">View listings</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="transition-colors hover:bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Enquiries</CardTitle>
            <CardDescription>Manage enquiries from your listings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled>
              Coming soon
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
