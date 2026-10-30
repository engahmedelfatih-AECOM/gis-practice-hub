import type { NextRequest } from "next/server";
import { feedRegister } from "@/application/hub/feed";
import { feedRoute } from "../../_lib";

export const dynamic = "force-dynamic";

/** GET /api/hub/v1/updates?project=: the updates register (x-api-key). */
export const GET = feedRoute(async (req: NextRequest) => feedRegister("updates", req.nextUrl.searchParams.get("project")));
