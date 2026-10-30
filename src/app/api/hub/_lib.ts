import { NextResponse, type NextRequest } from "next/server";
import { authenticateApiKey } from "@/application/integration/api-keys";
import { isAppError } from "@/application/errors";
import { logger } from "@/lib/logger";

/**
 * Wrap a feed handler: API key authentication (`x-api-key` header or `?api_key=`), the
 * `hub:read` scope, JSON errors and no caching. The Resource Planner reads these feeds.
 */
export function feedRoute(handler: (req: NextRequest) => Promise<unknown>) {
  return async (req: NextRequest) => {
    const key = req.headers.get("x-api-key") ?? req.nextUrl.searchParams.get("api_key");
    const principal = await authenticateApiKey(key);
    if (!principal) return NextResponse.json({ error: "A valid API key is required (x-api-key header)." }, { status: 401 });
    if (!principal.scopes.includes("hub:read")) return NextResponse.json({ error: "This key cannot read the hub feed." }, { status: 403 });
    try {
      const body = await handler(req);
      return NextResponse.json({ generatedAt: new Date().toISOString(), ...(body as object) }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      if (isAppError(err)) return NextResponse.json({ error: err.message }, { status: err.status });
      logger.error({ err, key: principal.name }, "hub feed failed");
      return NextResponse.json({ error: "Feed unavailable." }, { status: 500 });
    }
  };
}
