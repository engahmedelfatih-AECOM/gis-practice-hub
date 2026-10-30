import type { Metadata } from "next";
import { requireActor } from "@/application/auth/actor";
import { listImportRuns } from "@/application/hub/import";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { ActionForm, FormMessage } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { guarded } from "@/app/_lib/page-guard";
import { ImportForm } from "./import-form";
import { importClientAction, importHubAction, removeAllAction } from "./actions";

export const metadata: Metadata = { title: "Import workbooks" };

/** Administrators load the GIS_Practice_Hub workbook (whole Hub) or a client Master Tracker. */
export default async function ImportPage() {
  return guarded(async () => {
    const actor = await requireActor();
    const runs = await listImportRuns(actor);
    return (
      <>
        <PageHeader
          title="Import workbooks"
          description="Load the Excel files the team uses today. Rows are matched on their natural key, so the same file can be loaded again after changes. Run a dry run first to see the counts."
          crumbs={[{ label: "Administration" }, { label: "Import workbooks" }]}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card id="hub">
            <CardHeader title="GIS_Practice_Hub.xlsx" description="Every sheet: Projects, Packages, Schema Tracker, Resources, Updates, Risks, RFI Log, QAQC, Standards, Innovation, Lists (dropdowns and the period calendar), and the workflow steps of each project update sheet." />
            <CardBody>
              <ImportForm action={importHubAction} kind="hub" />
            </CardBody>
          </Card>
          <Card id="client">
            <CardHeader title="Client Master Tracker (for example QIC_Master_Tracker_AECOM.xlsx)" description="Master Tracker, Dictionary, Subtypes and Domains of one client. Loading again replaces that client's schema." />
            <CardBody>
              <ImportForm action={importClientAction} kind="client" />
            </CardBody>
          </Card>
        </div>
        <Card className="mt-4">
          <CardHeader title="Recent imports" />
          <CardBody className="p-0">
            <Table>
              <THead>
                <tr>
                  <TH>When</TH>
                  <TH>Kind</TH>
                  <TH>File</TH>
                  <TH>Dry run</TH>
                  <TH>Status</TH>
                  <TH>Summary</TH>
                </tr>
              </THead>
              <TBody>
                {runs.map((r) => (
                  <TR key={r.id}>
                    <TD className="whitespace-nowrap">{formatDateTime(r.startedAt)}</TD>
                    <TD>{r.kind === "HUB_WORKBOOK" ? "Hub workbook" : "Client schema"}</TD>
                    <TD>{r.fileName}</TD>
                    <TD>{r.dryRun ? "Yes" : "No"}</TD>
                    <TD>{r.status}</TD>
                    <TD className="max-w-xl text-xs text-gray-600">{summarise(r.summary)}{r.error ? ` Error: ${r.error}` : ""}</TD>
                  </TR>
                ))}
                {runs.length === 0 ? (
                  <TR>
                    <TD colSpan={6} className="text-center text-gray-500">
                      No imports yet.
                    </TD>
                  </TR>
                ) : null}
              </TBody>
            </Table>
          </CardBody>
        </Card>
        <Card className="mt-4">
          <CardHeader title="Remove all register data" description="Deletes projects, packages, schema rows, resources, updates, risks, RFIs, checklists, standards and innovation items. Lists, periods, users and settings stay. Use before loading a clean workbook." />
          <CardBody>
            <ActionForm action={removeAllAction}>
              <ConfirmSubmit title="Remove all register data?" description="Every project and register row is deleted. The audit log keeps the record of this action, not the rows." confirmLabel="Remove everything">
                Remove all register data
              </ConfirmSubmit>
              <FormMessage />
            </ActionForm>
          </CardBody>
        </Card>
      </>
    );
  });
}

function summarise(s: Record<string, unknown>): string {
  if (!s || typeof s !== "object") return "";
  if ("registers" in s) {
    const regs = s.registers as { sheet: string; rows: number; inserted: number; updated: number }[];
    return regs.map((r) => `${r.sheet}: ${r.rows} rows (${r.inserted} new, ${r.updated} updated)`).join("; ");
  }
  if ("featureClasses" in s) return `${s.clientName}: ${s.featureClasses} feature classes, ${s.fields} fields, ${s.subtypes} subtypes, ${s.domains} domains`;
  return "";
}
