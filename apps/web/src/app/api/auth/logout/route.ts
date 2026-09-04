import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  await destroyCurrentSession();
  return NextResponse.json({ ok: true });
}
