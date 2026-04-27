import { listDiscountCodes } from "@/lib/actions/discount-codes";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PlusIcon, Tag } from "lucide-react";
import Link from "next/link";
import { DiscountCodesTable } from "./discount-codes-table";

export default async function AdminDiscountCodesPage() {
  const codes = await listDiscountCodes();

  const active = codes.filter((c) => c.active).length;
  const totalRedemptions = codes.reduce((sum, c) => sum + c.used_count, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Discount codes"
        description="Promotional codes brokers and agencies can apply at checkout. Useful for onboarding offers and free trials."
        action={
          <Button asChild className="w-full sm:w-auto gap-1.5">
            <Link href="/admin/discount-codes/new">
              <PlusIcon className="h-4 w-4" />
              New code
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold">{codes.length}</span>
            <span className="text-xs text-muted-foreground">Total codes</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold text-primary">{active}</span>
            <span className="text-xs text-muted-foreground">Active</span>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex flex-col items-center gap-0.5 p-0 text-center">
            <span className="text-2xl font-semibold">{totalRedemptions}</span>
            <span className="text-xs text-muted-foreground">Total redemptions</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All codes</CardTitle>
          <CardDescription>
            Codes are validated at checkout. 100%-off codes bypass the card form
            and the listing is activated immediately.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {codes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center px-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Tag className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="font-medium">No codes yet</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Create your first promo code — for example a 100% onboarding
                  code so brokers can experience the platform free for 60 days.
                </p>
              </div>
              <Button asChild size="sm" className="gap-1.5">
                <Link href="/admin/discount-codes/new">
                  <PlusIcon className="h-4 w-4" />
                  New code
                </Link>
              </Button>
            </div>
          ) : (
            <DiscountCodesTable codes={codes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
