import { notFound } from "next/navigation";
import { getDiscountCodeById } from "@/lib/actions/discount-codes";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DiscountCodeForm } from "../../discount-code-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditDiscountCodePage({ params }: Props) {
  const { id } = await params;
  const code = await getDiscountCodeById(id);
  if (!code) notFound();

  const usageLabel =
    code.max_uses != null
      ? `${code.used_count} of ${code.max_uses} redemptions used`
      : `${code.used_count} redemptions (unlimited)`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${code.code}`}
        description="Update this code's discount, validity or status."
        backHref="/admin/discount-codes"
        backLabel="Back to codes"
      />

      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base">Code details</CardTitle>
          <CardDescription>{usageLabel}</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <DiscountCodeForm code={code} />
        </CardContent>
      </Card>
    </div>
  );
}
