import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            You don’t have permission to view this page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">Go to home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
