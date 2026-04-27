import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  rewriteText,
  generateText,
  KIND_CONFIG,
  type AITextKind,
  type AIMode,
} from "@/lib/ai/text";

const VALID_KINDS = Object.keys(KIND_CONFIG) as AITextKind[];

/**
 * Per-kind allowlist of who can call which kind. Keep this in lockstep with
 * how the AITextActions component is mounted in the app.
 */
const KIND_ROLES: Record<AITextKind, Array<"broker" | "admin">> = {
  broker_bio: ["broker"],
  agency_bio: ["broker"],
  outreach_listing_share: ["broker"],
  outreach_bulk_send: ["broker"],
  ad_copy: ["admin"],
};

const MAX_INPUT_LEN = 8000;

type Body = {
  kind?: string;
  mode?: string;
  text?: string;
  context?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role as "broker" | "admin" | undefined;
  if (!session?.user?.id || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kind = body.kind as AITextKind;
  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: "Unknown content kind." }, { status: 400 });
  }

  if (!KIND_ROLES[kind].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mode = body.mode as AIMode;
  if (mode !== "rewrite" && mode !== "generate") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  if (mode === "rewrite") {
    const text = body.text?.trim() ?? "";
    if (!text) {
      return NextResponse.json(
        { error: "Add some text first, then click Improve with AI." },
        { status: 400 }
      );
    }
    if (text.length > MAX_INPUT_LEN) {
      return NextResponse.json(
        { error: `Text is too long to rewrite (${MAX_INPUT_LEN} character max).` },
        { status: 400 }
      );
    }
  }

  try {
    const result =
      mode === "rewrite"
        ? await rewriteText({ kind, text: body.text!, context: body.context })
        : await generateText({ kind, context: body.context });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: errorMessage(err) },
      { status: errorStatus(err) }
    );
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Something went wrong while generating content.";
}

function errorStatus(err: unknown): number {
  if (err instanceof Error && /not configured/i.test(err.message)) return 503;
  return 500;
}
