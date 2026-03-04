import { Suspense } from "react";
import { AuthErrorContent } from "./error-content";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
