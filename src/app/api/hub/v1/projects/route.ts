import { feedProjects } from "@/application/hub/feed";
import { feedRoute } from "../../_lib";

export const dynamic = "force-dynamic";

/** GET /api/hub/v1/projects: every project with its calculated delivery columns (x-api-key). */
export const GET = feedRoute(async () => feedProjects());
