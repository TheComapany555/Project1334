import { getBrokerDocumentAccessRequests } from "@/lib/actions/documents";
import { DocumentAccessClient } from "./document-access-client";

export default async function DocumentAccessPage() {
  const pending = await getBrokerDocumentAccessRequests({ status: "pending" });
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Document access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review buyers who requested access after signing NDAs on your listings.
        </p>
      </div>
      <DocumentAccessClient initialPending={pending} />
    </div>
  );
}
