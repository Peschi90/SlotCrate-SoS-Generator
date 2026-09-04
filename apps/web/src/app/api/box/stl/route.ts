import { NextRequest, NextResponse } from "next/server";
import { boxRequestSchema } from "@/lib/schema";
import { requestBoxStl } from "@/lib/cad-client";

export const runtime = "nodejs";

export async function POST(req: NextRequest): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = boxRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid payload", details: parsed.error.issues }, { status: 422 });
  }
  try {
    const blob = await requestBoxStl(parsed.data);
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "model/stl",
        "Content-Disposition": `attachment; filename="SlotCrate_Box_${parsed.data.widthCells}x${parsed.data.depthCells}_H${parsed.data.heightMm}.stl"`
      }
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
