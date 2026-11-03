import { NextResponse, type NextRequest } from "next/server";
import { authenticateApiKey } from "@/application/integration/api-keys";
import { isAppError } from "@/application/errors";
import { logger } from "@/lib/logger";

/**
 * Wrap a feed handler: API key authentication, the `hub:read` scope, JSON errors and no caching.
 * The Resource Planner reads these feeds. The key travels in the `x-api-key` header only: a key
 * in the query string would end up in every access log and proxy cache on the way.
 */
export function feedRoute(handler: (req: NextRequest) => Promise<unknown>) {
  return async (req: NextRequest) => {
    if (req.nextUrl.searchParams.has("api_key")) {
      return NextResponse.json({ error: "Send the key in the x-api-key header, not in the URL." }, { status: 400 });
    }
    const principal = await authenticateApiKey(req.headers.get("x-api-key"));
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
