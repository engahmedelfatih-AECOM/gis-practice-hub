import { NextResponse, type NextRequest } from "next/server";
import { exportRegister } from "@/application/hub/exports";
import { REGISTERS, type RegisterKey } from "@/domain/hub/registers";
import { exportResponse } from "../../_lib";

export const dynamic = "force-dynamic";

/** GET /api/export/register/[key]?project=: a register as an Excel sheet. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  if (!(key in REGISTERS)) return NextResponse.json({ error: "Unknown register." }, { status: 404 });
  const project = req.nextUrl.searchParams.get("project");
  return exportResponse((actor) => exportRegister(actor, key as RegisterKey, project));
}
