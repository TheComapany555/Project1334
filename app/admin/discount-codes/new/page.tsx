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
        backHref="/admin/products?tab=discounts"
        backLabel="Back to discount codes"
      />

      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base">Code details</CardTitle>
          <CardDescription>
            For an onboarding offer, try a memorable code like{" "}
            <span className="font-mono font-medium text-foreground">WELCOME100</span>{" "}
            with 100% off and a 60 day expiry.
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
