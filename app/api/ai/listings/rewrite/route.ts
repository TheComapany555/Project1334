import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  rewriteListingContent,
  type ListingContext,
} from "@/lib/ai/listings";

type Body = {
  description?: string;
  summary?: string;
  context?: {
    title?: string | null;
    categoryId?: string | null;
    askingPrice?: number | null;
    priceType?: "fixed" | "poa" | null;
    suburb?: string | null;
    state?: string | null;
    postcode?: string | null;
    highlightIds?: string[];
  };
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const description = body.description?.trim();
  if (!description) {
    return NextResponse.json(
      { error: "Add some description text first, then click Improve with AI." },
      { status: 400 }
    );
  }
  if (description.length > 10000) {
    return NextResponse.json(
      { error: "Description is too long to rewrite (10,000 character max)." },
      { status: 400 }
    );
  }

  try {
    const context = await resolveContext(body.context);
    const result = await rewriteListingContent({
      description,
      summary: body.summary ?? null,
      context,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: errorMessage(err) },
      { status: errorStatus(err) }
    );
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

async function resolveContext(
  raw: Body["context"]
): Promise<ListingContext | undefined> {
  if (!raw) return undefined;
  const supabase = createServiceRoleClient();

  let category: string | null = null;
  if (raw.categoryId) {
    const { data } = await supabase
      .from("categories")
      .select("name")
      .eq("id", raw.categoryId)
      .maybeSingle();
    category = data?.name ?? null;
  }

  let highlights: string[] = [];
  if (raw.highlightIds && raw.highlightIds.length) {
    const { data } = await supabase
      .from("listing_highlights")
      .select("label")
      .in("id", raw.highlightIds);
    highlights = (data ?? []).map((h) => h.label).filter(Boolean);
  }

  return {
    title: raw.title ?? null,
    category,
    askingPrice: raw.askingPrice ?? null,
    priceType: raw.priceType ?? null,
    currency: "AUD",
    suburb: raw.suburb ?? null,
    state: raw.state ?? null,
    postcode: raw.postcode ?? null,
    highlights,
  };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Something went wrong while generating content.";
}

function errorStatus(err: unknown): number {
  if (err instanceof Error && /not configured/i.test(err.message)) return 503;
  return 500;
}
