import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: { id: string } }
): Promise<NextResponse> {
  const id = ctx.params.id;
  if (!/^[A-Za-z0-9_-]{6,16}$/.test(id)) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }
  const row = await prisma.sharedLayout.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "SHARE_NOT_FOUND" }, { status: 404 });
  }
  if (row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "SHARE_EXPIRED" }, { status: 410 });
  }
  // Best-Effort Hit-Zähler; darf niemals den Response blockieren.
  prisma.sharedLayout
    .update({ where: { id }, data: { hitCount: { increment: 1 } } })
    .catch(() => undefined);
  return NextResponse.json(
    {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      draft: row.payload
    },
    { status: 200 }
  );
}
