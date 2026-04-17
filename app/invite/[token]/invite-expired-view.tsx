import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  reason: "not_found" | "expired";
};

export function InviteExpiredView({ reason }: Props) {
  const title = reason === "expired" ? "This invite has expired" : "Invite not found";
  const message =
    reason === "expired"
      ? "Magic links are valid for 30 days. Ask the broker to send a new invite."
      : "This invite link is invalid or has been removed.";

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-700" />
            </div>
          </div>
          <CardTitle className="text-center">{title}</CardTitle>
          <CardDescription className="text-center">{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/">Browse listings</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
