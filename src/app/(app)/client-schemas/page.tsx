import type { Metadata } from "next";
import Link from "next/link";
import { requireActor } from "@/application/auth/actor";
import { listClientSchemas } from "@/application/hub/client-schemas";
import { can } from "@/domain/authz/policy";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { guarded } from "@/app/_lib/page-guard";

export const metadata: Metadata = { title: "Master Trackers" };

/** One card per client schema: the Master Tracker workbook of that client with its KPI tiles. */
export default async function ClientSchemasPage() {
  return guarded(async () => {
    const actor = await requireActor();
    const schemas = await listClientSchemas(actor);
    return (
      <>
        <PageHeader
          title="Client Master Trackers"
          description="One schema per client (feature classes, dictionary, subtypes, domains), loaded from the <Client>_Master_Tracker_AECOM workbook. The specialist keeps availability, status, comments and links current here."
          crumbs={[{ label: "Client schemas" }]}
          actions={can(actor, "import:run") ? <ButtonLink href="/admin/import#client">Import a Master Tracker</ButtonLink> : null}
        />
        {schemas.length === 0 ? (
          <EmptyState title="No client schema yet" description="Import the QIC_Master_Tracker_AECOM.xlsx workbook under Administration > Import workbooks." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {schemas.map((s) => (
              <Link key={s.id} href={`/client-schemas/${s.id}`} className="border-border bg-surface hover:border-brand-green block rounded-lg border p-5">
                <h2 className="text-brand-green-deep text-lg font-bold">{s.clientName}</h2>
                <p className="text-xs text-gray-600">
                  {s.schemaVersion ? `Schema ${s.schemaVersion} - ` : ""}
                  {s.gisLead ? `GIS lead ${s.gisLead}` : "GIS lead not set"}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <Tile label="Feature classes" value={s.featureClasses} />
                  <Tile label="Available" value={s.available} />
                  <Tile label="Unavailable" value={s.unavailable} />
                  <Tile label="Partial" value={s.partial} />
                  <Tile label="Approved" value={s.approved} />
                  <Tile label="% available" value={s.featureClasses ? `${Math.round(((s.available + 0.5 * s.partial) / s.featureClasses) * 100)} %` : "-"} />
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  {s.fields} fields, {s.subtypes} subtypes, {s.domains} domains
                </p>
              </Link>
            ))}
          </div>
        )}
      </>
    );
  });
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-earth-green-25 rounded px-2 py-1.5">
      <p className="text-brand-green-deep text-base font-bold">{value}</p>
      <p className="text-[10px] uppercase">{label}</p>
    </div>
  );
}
