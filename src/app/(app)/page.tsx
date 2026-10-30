import Link from "next/link";
import { requireActor } from "@/application/auth/actor";
import { dashboard } from "@/application/hub/views";
import { getOverview } from "@/application/system/overview";
import { stageCode } from "@/domain/hub/rules";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PeriodSelect } from "@/components/hub/period-select";
import { ProjectsMap } from "@/components/hub/projects-map";
import { toneClass } from "@/components/hub/tones";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { guarded } from "@/app/_lib/page-guard";
import { param, type SearchParams } from "@/app/_lib/actions";

/** The Dashboard sheet: KPI tiles, project status table, status chart and the projects map. */
export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return guarded(async () => {
    const actor = await requireActor();
    const [d, overview] = await Promise.all([dashboard(actor, param(sp, "period")), getOverview(actor)]);
    const k = d.kpis;
    const pending = overview.setup.filter((s) => !s.done);
    return (
      <div className="space-y-5">
        <div className="bg-earth-green rounded-lg px-5 py-4 text-white">
          <h1 className="text-xl font-bold">GIS PRACTICE HUB - DASHBOARD</h1>
          <p className="text-sm opacity-90">AECOM Digital Delivery | Civil Infrastructure - Middle East | Everything on this page calculates from the registers.</p>
        </div>
        {pending.length ? (
          <Card>
            <CardHeader title="Setup" description="Steps to complete before the team starts." />
            <CardBody>
              <ul className="space-y-1 text-sm">
                {pending.map((s) => (
                  <li key={s.label}>
                    <Link href={s.href} className="text-brand-link hover:underline">
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <PeriodSelect periods={d.periods} selected={d.period?.id ?? ""} basePath="/" />
          {d.period ? (
            <span className="text-gray-600">
              Period: {formatDate(d.period.startDate)} to {formatDate(d.period.endDate)} - Generated: {formatDate(d.today)}
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Kpi label="Total projects" value={k.totalProjects} />
          <Kpi label="Active projects" value={k.activeProjects} dark />
          <Kpi label="Not started" value={k.notStarted} />
          <Kpi label="At risk" value={k.atRisk} dark />
          <Kpi label="Submissions this period" value={k.submissionsThisPeriod} />
          <Kpi label="Open client comments" value={k.openClientComments} dark />
          <Kpi label="Open RFIs" value={k.openRfis} />
          <Kpi label="Team utilisation" value={k.teamUtilisation === null ? "-" : `${k.teamUtilisation} %`} dark />
          <Kpi label="Open risks" value={k.openRisks} />
          <Kpi label="Overdue RFIs" value={k.overdueRfis} dark />
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card>
            <CardHeader title="PROJECT STATUS - all projects in the register" />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-earth-green text-white">
                  <tr>
                    {["#", "Project", "Client", "Design Stage", "GIS Delivered / Approved", "GIS In Progress", "GIS Resources Region", "Status", "Next Milestone", "Open CRS", "Open RFIs"].map((h) => (
                      <th key={h} className="px-2 py-2 text-left font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {d.projects.map((p, i) => (
                    <tr key={p.id} className="odd:bg-stone-gray-25 align-top">
                      <td className="px-2 py-1.5">{i + 1}</td>
                      <td className="px-2 py-1.5 font-medium whitespace-nowrap">
                        <Link href={`/projects/${p.id}${d.period ? `?period=${d.period.id}` : ""}`} className="text-brand-link hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-2 py-1.5">{p.client}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{p.currentDesignStage ? `${stageCode(p.currentDesignStage)} - ${p.currentDesignStage.split(" - ")[1] ?? ""}` : ""}</td>
                      <td className="max-w-56 px-2 py-1.5">{p.delivered || "-"}</td>
                      <td className="max-w-56 px-2 py-1.5">{p.inProgress || "-"}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{p.region}</td>
                      <td className="px-2 py-1.5">
                        <span className={cn("inline-block rounded px-1.5 py-0.5 font-medium whitespace-nowrap", toneClass(p.status))}>{p.status}</span>
                      </td>
                      <td className="max-w-56 px-2 py-1.5">{p.milestone.text}</td>
                      <td className="px-2 py-1.5 text-center">{p.crsOpen || "-"}</td>
                      <td className="px-2 py-1.5 text-center">{p.rfi.open}</td>
                    </tr>
                  ))}
                  {d.projects.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-sm text-gray-500">
                        No projects yet. Register one under Projects or import the workbook.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="space-y-5">
            <Card>
              <CardHeader title="Projects by status" />
              <CardBody>
                <ul className="space-y-2 text-sm">
                  {d.statusCounts.map((s) => {
                    const pct = k.totalProjects ? Math.round((s.count / k.totalProjects) * 100) : 0;
                    return (
                      <li key={s.status}>
                        <div className="flex justify-between">
                          <span>{s.status}</span>
                          <span className="tabular-nums text-gray-600">
                            {s.count} ({pct} %)
                          </span>
                        </div>
                        <div className="bg-black-10 mt-1 h-2 rounded">
                          <div className={cn("h-2 rounded", toneClass(s.status) || "bg-black-50")} style={{ width: `${pct}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
        <Card>
          <CardHeader title="Projects map" description="Projects with a location on the Projects register. Click a marker to open the update page." />
          <CardBody className="p-0">
            <ProjectsMap points={d.map} center={d.mapSettings} />
          </CardBody>
        </Card>
      </div>
    );
  });
}

function Kpi({ label, value, dark }: { label: string; value: string | number; dark?: boolean }) {
  return (
    <div className={cn("rounded-md px-3 py-3 text-center text-white", dark ? "bg-midnight-teal" : "bg-earth-green")}>
      <p className="text-sunrise-yellow text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-[11px] tracking-wide uppercase opacity-90">{label}</p>
    </div>
  );
}
