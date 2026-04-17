import { getAllNdaSignatures, getAdminNdaStats } from "@/lib/actions/nda";
import { NdaSignaturesTable } from "./nda-signatures-table";

export default async function AdminNdasPage() {
  const [{ signatures }, stats] = await Promise.all([
    getAllNdaSignatures({ page: 1, pageSize: 500 }),
    getAdminNdaStats(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          NDA Signatures
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View all NDA signatures across listings.
        </p>
      </div>

      <NdaSignaturesTable signatures={signatures} stats={stats} />
    </div>
  );
}
