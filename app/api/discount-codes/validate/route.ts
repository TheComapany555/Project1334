import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateDiscountCode } from "@/lib/actions/discount-codes";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "broker") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { code, productId } = body as { code?: string; productId?: string };

  if (!code || !productId) {
    return NextResponse.json(
      { ok: false, error: "Missing code or product." },
      { status: 400 }
    );
  }

  const result = await validateDiscountCode({
    code,
    productId,
    agencyId: session.user.agencyId ?? null,
  });

  return NextResponse.json(result);
}
