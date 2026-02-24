import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
          <CardDescription>Manage your broker profile (Milestone 2).</CardDescription>
        </CardHeader>
        <CardContent>Placeholder — coming in Milestone 2.</CardContent>
      </Card>
    </div>
  );
}
