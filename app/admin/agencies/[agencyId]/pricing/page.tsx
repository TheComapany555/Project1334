import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getAgencyPricingOverrides } from "@/lib/actions/admin-pricing";
import { getAllProducts } from "@/lib/actions/products";
import { PageHeader } from "@/components/admin/page-header";
import { AgencyPricingManager } from "./pricing-manager";

type Props = { params: Promise<{ agencyId: string }> };

export default async function AgencyPricingPage({ params }: Props) {
  const { agencyId } = await params;
  const supabase = createServiceRoleClient();

  const { data: agency } = await supabase
    .from("agencies")
    .select("id, name, slug, email")
    .eq("id", agencyId)
    .single();

  if (!agency) notFound();

  const [overrides, allProducts] = await Promise.all([
    getAgencyPricingOverrides(agencyId),
    getAllProducts(),
  ]);

  // Show all active product types for custom pricing (listing tiers, featured, and subscription)
  const pricingProducts = allProducts.filter(
    (p) => p.status === "active"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Custom Pricing: ${agency.name}`}
        description="Set custom prices for this agency. Overrides apply during checkout and replace the default product prices."
        backHref="/admin/brokers"
        backLabel="Back to Agencies"
      />

      <AgencyPricingManager
        agencyId={agencyId}
        agencyName={agency.name}
        products={pricingProducts}
        overrides={overrides}
      />
    </div>
  );
}
