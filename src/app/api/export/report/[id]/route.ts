import type { NextRequest } from "next/server";
import { exportReport } from "@/application/hub/exports";
import { exportResponse, formatOf } from "../../_lib";

export const dynamic = "force-dynamic";

/** GET /api/export/report/[projectId]?period=&format=xlsx|pdf: the project update page. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return exportResponse((actor) => exportReport(actor, id, req.nextUrl.searchParams.get("period"), formatOf(req)));
}
