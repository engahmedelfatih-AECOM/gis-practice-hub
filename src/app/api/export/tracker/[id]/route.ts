import type { NextRequest } from "next/server";
import { exportTracker } from "@/application/hub/exports";
import { exportResponse, formatOf } from "../../_lib";

export const dynamic = "force-dynamic";

/** GET /api/export/tracker/[projectId]?format=xlsx|pdf: the Delivery Tracker in the Laheq layout. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return exportResponse((actor) => exportTracker(actor, id, formatOf(req)));
}
