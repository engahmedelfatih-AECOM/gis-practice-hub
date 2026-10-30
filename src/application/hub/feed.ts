import "server-only";
import { systemActor } from "@/application/auth/system-actor";
import { listRows } from "./registers";
import { projectsView } from "./views";

/**
 * Read-only JSON feeds for the Resource Planner link (keyed by project name and job number).
 * The planner owns the project record; the hub tells it the delivery status.
 */
export async function feedProjects() {
  const actor = systemActor("feed");
  const { rows, period } = await projectsView(actor);
  return {
    period,
    projects: rows.map((p) => ({
      id: p.id,
      name: p.name,
      jobNo: p.jobNo,
      client: p.client,
      status: p.status,
      currentDesignStage: p.currentDesignStage,
      gisLead: p.gisLead,
      region: p.region,
      stageStates: p.stageStates,
      delivered: p.delivered,
      inProgress: p.inProgress,
      nextMilestone: p.milestone,
      utilisation: p.utilisation,
      rfi: p.rfi,
      crs: { open: p.crsOpen, inReview: p.crsInReview, closed: p.crsClosed },
      dataShareFolderUrl: p.dataShareFolderUrl,
      location: p.latitude && p.longitude ? { lat: Number(p.latitude), lng: Number(p.longitude), label: p.locationLabel } : null,
      updatedAt: p.updatedAt,
    })),
  };
}

export async function feedRegister(key: "packages" | "updates" | "schema", projectId: string | null) {
  const rows = await listRows(systemActor("feed"), key, { projectId });
  return { rows };
}
