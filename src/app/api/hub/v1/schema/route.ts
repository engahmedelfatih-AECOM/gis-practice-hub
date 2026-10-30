import type { NextRequest } from "next/server";
import { feedRegister } from "@/application/hub/feed";
import { feedRoute } from "../../_lib";

export const dynamic = "force-dynamic";

/** GET /api/hub/v1/schema?project=: the schema register (x-api-key). */
export const GET = feedRoute(async (req: NextRequest) => feedRegister("schema", req.nextUrl.searchParams.get("project")));
