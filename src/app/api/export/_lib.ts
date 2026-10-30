import { NextResponse } from "next/server";
import { getActor } from "@/application/auth/actor";
import { isAppError } from "@/application/errors";
import { logger } from "@/lib/logger";

const TYPES = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;

/** Run an export for the signed-in user and stream the file (no caching, attachment). */
export async function exportResponse(run: (actor: NonNullable<Awaited<ReturnType<typeof getActor>>>) => Promise<{ buffer: Buffer; fileName: string }>) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    const { buffer, fileName } = await run(actor);
    const ext = fileName.endsWith(".pdf") ? "pdf" : "xlsx";
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": TYPES[ext],
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.message }, { status: err.status });
    logger.error({ err }, "export failed");
    return NextResponse.json({ error: "Export failed." }, { status: 500 });
  }
}

export function formatOf(req: Request): "xlsx" | "pdf" {
  return new URL(req.url).searchParams.get("format") === "pdf" ? "pdf" : "xlsx";
}
