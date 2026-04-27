import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DiscountCodeForm } from "../discount-code-form";

export default function NewDiscountCodePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="New discount code"
        description="Create a promotional code brokers can apply at checkout."
        backHref="/admin/discount-codes"
        backLabel="Back to codes"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Code details</CardTitle>
          <CardDescription>
            Tip: for an onboarding offer, use a memorable code like{" "}
            <span className="font-mono">WELCOME100</span> with 100% off and an
            expiry date.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <DiscountCodeForm />
        </CardContent>
      </Card>
    </div>
  );
}
