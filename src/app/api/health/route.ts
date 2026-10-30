import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/application/system/health";

export const dynamic = "force-dynamic";

/** Liveness/readiness probe used by the container platform. Unauthenticated, no data. */
export async function GET() {
  const dbOk = await checkDatabaseHealth();
  return NextResponse.json(
    { status: dbOk ? "ok" : "degraded", database: dbOk ? "up" : "down" },
    { status: dbOk ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
