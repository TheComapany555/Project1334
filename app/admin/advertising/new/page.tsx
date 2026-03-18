import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AdvertisingForm } from "../advertising-form";

export default function NewAdPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create ad"
        description="Set up a new advertisement placement."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ad details</CardTitle>
          <CardDescription>
            Configure the content, placement, and schedule for this ad.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <AdvertisingForm />
        </CardContent>
      </Card>
    </div>
  );
}
