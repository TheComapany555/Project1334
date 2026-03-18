import { notFound } from "next/navigation";
import { getAdById } from "@/lib/actions/admin-advertising";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AdvertisingForm } from "../../advertising-form";

type Props = { params: Promise<{ id: string }> };

export default async function EditAdPage({ params }: Props) {
  const { id } = await params;
  const ad = await getAdById(id);
  if (!ad) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit ad"
        description={`Editing "${ad.title}"`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ad details</CardTitle>
          <CardDescription>
            Update the content, placement, or schedule for this ad.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <AdvertisingForm ad={ad} />
        </CardContent>
      </Card>
    </div>
  );
}
