import type { Metadata } from "next";
import Link from "next/link";
import { requireActor } from "@/application/auth/actor";
import { getClientSchema } from "@/application/hub/client-schemas";
import { listValues } from "@/application/hub/lists";
import { peopleNames } from "@/application/hub/registers";
import { can } from "@/domain/authz/policy";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { toneClass } from "@/components/hub/tones";
import { cn } from "@/lib/cn";
import { guarded } from "@/app/_lib/page-guard";
import { param, type Params, type SearchParams } from "@/app/_lib/actions";
import { FeatureClassForm, SchemaHeaderForm } from "./forms";

export const metadata: Metadata = { title: "Master Tracker" };

const TABS = ["tracker", "dictionary", "subtypes", "domains"] as const;

/** The Master Tracker of one client: feature classes with status, then the dictionary, subtypes and domains tabs. */
export default async function ClientSchemaPage({ params, searchParams }: { params: Params<{ id: string }>; searchParams: SearchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  return guarded(async () => {
    const actor = await requireActor();
    const data = await getClientSchema(actor, id);
    const tab = (TABS as readonly string[]).includes(param(sp, "tab") ?? "") ? (param(sp, "tab") as (typeof TABS)[number]) : "tracker";
    const editId = param(sp, "edit");
    const q = (param(sp, "q") ?? "").toLowerCase();
    const canEdit = can(actor, "clientSchema:manage");
    const [geometry, disciplines, people] = canEdit ? await Promise.all([listValues("geometryType"), listValues("discipline"), peopleNames()]) : [[], [], []];
    const s = data.schema;
    const fcs = data.featureClasses.filter((f) => !q || `${f.groupingName} ${f.featureClass} ${f.discipline} ${f.status}`.toLowerCase().includes(q));
    const editing = editId ? data.featureClasses.find((f) => f.id === editId) : null;
    return (
      <>
        <PageHeader
          title={`${s.clientName} - Master Tracker`}
          description={`${data.featureClasses.length} feature classes, ${data.fields.length} fields, ${data.subtypes.length} subtypes, ${data.domains.length} domains`}
          crumbs={[{ label: "Client schemas", href: "/client-schemas" }, { label: s.clientName }]}
        />
        {canEdit ? (
          <Card className="mb-4">
            <CardHeader title="Schema header" description="GIS lead and schema version shown on the tracker." />
            <CardBody>
              <SchemaHeaderForm schema={{ id: s.id, version: s.version, gisLead: s.gisLead, schemaVersion: s.schemaVersion, notes: s.notes }} />
            </CardBody>
          </Card>
        ) : null}
        <nav className="mb-4 flex gap-1 border-b border-border text-sm">
          {TABS.map((t) => (
            <Link key={t} href={`/client-schemas/${s.id}?tab=${t}`} className={cn("-mb-px border-b-2 px-3 py-2 capitalize", tab === t ? "border-brand-primary text-brand-green-deep font-semibold" : "border-transparent text-gray-600 hover:text-gray-900")}>
              {t === "tracker" ? "Master Tracker" : t}
            </Link>
          ))}
        </nav>
        {tab === "tracker" ? (
          <>
            <form method="get" className="mb-3 flex items-center gap-2 text-sm">
              <input type="hidden" name="tab" value="tracker" />
              <input name="q" defaultValue={q} placeholder="Filter by group, feature class, discipline or status" className="border-border h-9 w-96 rounded-md border px-3" />
              <button type="submit" className="border-border h-9 rounded-md border px-3">
                Filter
              </button>
            </form>
            {editing && canEdit ? (
              <Card className="mb-4">
                <CardHeader title={`Edit ${editing.featureClass}`} description="The schema columns (grouping, feature class, geometry) come from the client dictionary; the tracking columns are yours." />
                <CardBody>
                  <FeatureClassForm row={editing} geometry={geometry.map((g) => g.value)} disciplines={disciplines.map((d) => d.value)} people={people} cancelHref={`/client-schemas/${s.id}`} />
                </CardBody>
              </Card>
            ) : null}
            <div className="border-border bg-surface overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-earth-green text-white">
                  <tr>
                    {["#", "Grouping Abbr", "Grouping Name", "Feature Class", "Alias", "Geometry", "Discipline", "Discipline Individual", "Available / Unavailable", "GIS Comments", "Status", "Notes", "Source File", "Share Folder", ""].map((h, i) => (
                      <th key={i} className="px-2 py-2 text-left font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {fcs.map((f, i) => (
                    <tr key={f.id} className="odd:bg-stone-gray-25 align-top">
                      <td className="px-2 py-1">{i + 1}</td>
                      <td className="px-2 py-1">{f.groupingAbbr}</td>
                      <td className="px-2 py-1">{f.groupingName}</td>
                      <td className="px-2 py-1 font-medium whitespace-nowrap">{f.featureClass}</td>
                      <td className="px-2 py-1">{f.featureClassAlias}</td>
                      <td className="px-2 py-1">{f.geometryType}</td>
                      <td className="max-w-48 px-2 py-1">{f.discipline}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{f.disciplineIndividual}</td>
                      <td className="px-2 py-1">{f.availability ? <span className={cn("rounded px-1.5 py-0.5", toneClass(f.availability))}>{f.availability}</span> : ""}</td>
                      <td className="max-w-64 px-2 py-1">{f.gisComments}</td>
                      <td className="px-2 py-1">{f.status ? <span className={cn("rounded px-1.5 py-0.5 whitespace-nowrap", toneClass(f.status))}>{f.status}</span> : ""}</td>
                      <td className="max-w-64 px-2 py-1">{f.notes}</td>
                      <td className="px-2 py-1">{f.sourceFileUrl ? <a href={f.sourceFileUrl} className="text-brand-link hover:underline">Open</a> : ""}</td>
                      <td className="px-2 py-1">{f.shareFolderUrl ? <a href={f.shareFolderUrl} className="text-brand-link hover:underline">Open</a> : ""}</td>
                      <td className="px-2 py-1">{canEdit ? <Link href={`/client-schemas/${s.id}?tab=tracker&edit=${f.id}&q=${encodeURIComponent(q)}`} className="text-brand-link hover:underline">Edit</Link> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
        {tab === "dictionary" ? (
          <SimpleTable
            head={["Grouping", "Feature Class", "Geometry", "Field Name", "Field Alias", "Description", "ESRI Type", "Length", "Precision", "Scale", "Domain", "Nullable", "Default", "Units"]}
            rows={data.fields.map((f) => [f.grouping, f.featureClass, f.geometryType, f.fieldName, f.fieldAlias, f.description, f.esriType, f.textLength, f.numericPrecision, f.numericScale, f.domainHint, f.nullable, f.defaultValue, f.units])}
          />
        ) : null}
        {tab === "subtypes" ? <SimpleTable head={["Feature Class", "Subtype Code", "Subtype Name"]} rows={data.subtypes.map((x) => [x.featureClass, x.code, x.name])} /> : null}
        {tab === "domains" ? <SimpleTable head={["Domain Name", "Domain Type", "Domain Values"]} rows={data.domains.map((x) => [x.domainName, x.domainType, x.domainValues])} /> : null}
      </>
    );
  });
}

function SimpleTable({ head, rows }: { head: string[]; rows: (string | number | null)[][] }) {
  return (
    <div className="border-border bg-surface overflow-x-auto rounded-lg border">
      <table className="w-full text-xs">
        <thead className="bg-earth-green text-white">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-2 py-2 text-left font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-stone-gray-25 align-top">
              {r.map((c, j) => (
                <td key={j} className="max-w-96 px-2 py-1">
                  {c ?? ""}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={head.length} className="px-4 py-6 text-center text-gray-500">
                Nothing here.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
