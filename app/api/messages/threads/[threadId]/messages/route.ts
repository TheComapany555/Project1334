import { NextResponse } from "next/server";
import { getThreadMessages } from "@/lib/actions/messages";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? 80);
    const before = searchParams.get("before");

    const data = await getThreadMessages(threadId, {
      limit: Number.isFinite(limit) ? limit : 80,
      before,
    });

    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Couldn't load messages";
    const status =
      message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
