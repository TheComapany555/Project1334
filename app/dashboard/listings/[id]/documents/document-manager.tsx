"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  uploadListingDocument,
  deleteListingDocument,
} from "@/lib/actions/documents";
import {
  DOCUMENT_CATEGORY_LABELS,
  type DocumentCategory,
  type ListingDocument,
} from "@/lib/types/documents";
import {
  Upload,
  FileText,
  Trash2,
  Lock,
  ArrowLeft,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

type Props = {
  listingId: string;
  listingTitle: string;
  initialDocuments: ListingDocument[];
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentManager({
  listingId,
  listingTitle,
  initialDocuments,
}: Props) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setUploading(true);

    const formData = new FormData(e.currentTarget);
    const result = await uploadListingDocument(listingId, formData);

    setUploading(false);
    if (!result.ok) {
      setError(result.error);
    } else {
      setDocuments((prev) => [...prev, result.document]);
      setSuccess("Document uploaded successfully.");
      formRef.current?.reset();
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleDelete = async (docId: string) => {
    const result = await deleteListingDocument(listingId, docId);
    if (result.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/dashboard/listings/${listingId}/edit`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Document Vault</h1>
          <p className="text-sm text-muted-foreground truncate max-w-md">
            {listingTitle}
          </p>
        </div>
      </div>

      {/* Upload form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload Document
          </CardTitle>
          <CardDescription>
            Add documents to this listing. Confidential documents require buyers
            to sign an NDA.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            ref={formRef}
            onSubmit={handleUpload}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="doc-name">Document Name</Label>
                <Input
                  id="doc-name"
                  name="name"
                  placeholder="e.g. Profit & Loss 2025"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-category">Category</Label>
                <Select name="category" defaultValue="other">
                  <SelectTrigger id="doc-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOCUMENT_CATEGORY_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-file">File (max 10MB)</Label>
              <Input
                id="doc-file"
                name="file"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="doc-confidential"
                name="is_confidential"
                value="true"
                defaultChecked
              />
              <Label htmlFor="doc-confidential" className="text-sm">
                Confidential — requires NDA to access
              </Label>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Existing documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Documents ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No documents uploaded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 rounded-lg border border-border px-4 py-3"
                >
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">
                        {DOCUMENT_CATEGORY_LABELS[doc.category as DocumentCategory] ?? doc.category}
                      </Badge>
                      {doc.file_size && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                        </span>
                      )}
                      {doc.is_confidential && (
                        <Badge variant="secondary" className="text-[10px] gap-0.5">
                          <Lock className="h-2.5 w-2.5" />
                          Confidential
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link to NDA setup */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">NDA Configuration</p>
            <p className="text-xs text-muted-foreground">
              Require buyers to sign an NDA before accessing confidential
              documents.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/listings/${listingId}/nda`}>
              Manage NDA
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
