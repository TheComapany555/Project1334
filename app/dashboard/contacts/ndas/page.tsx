import { getBrokerNdaSignatures } from "@/lib/actions/nda";
import { BrokerNdaList } from "./broker-nda-list";

export default async function BrokerNdasPage() {
  const signatures = await getBrokerNdaSignatures();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          NDA Signatures
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Buyers who have signed NDAs for your listings.
        </p>
      </div>

      <BrokerNdaList signatures={signatures} />
    </div>
  );
}
