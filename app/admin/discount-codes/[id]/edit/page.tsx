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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit ${code.code}`}
        description="Update this code's discount, validity or status."
        backHref="/admin/discount-codes"
        backLabel="Back to codes"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Code details</CardTitle>
          <CardDescription>
            Redemptions: {code.used_count}
            {code.max_uses != null ? ` / ${code.max_uses}` : " (unlimited)"}
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <DiscountCodeForm code={code} />
        </CardContent>
      </Card>
    </div>
  );
}
