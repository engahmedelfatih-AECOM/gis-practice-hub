import type { Metadata } from "next";
import { requireActor } from "@/application/auth/actor";
import { historyFor } from "@/application/audit/read";
import { ENTITY_TYPE, editableFields, formSources, getRow } from "@/application/hub/registers";
import { can } from "@/domain/authz/policy";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { ActionForm } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { RegisterForm } from "@/components/hub/register-form";
import { HistoryPanel } from "@/app/(app)/_components/history-panel";
import { guarded } from "@/app/_lib/page-guard";
import type { Params } from "@/app/_lib/actions";
import { registerFromSegment } from "../_lib";
import type { RegisterDef } from "@/domain/hub/registers";
import { deleteRowAction, updateRowAction } from "../actions";

export async function generateMetadata({ params }: { params: Params<{ register: string; id: string }> }): Promise<Metadata> {
  const { register } = await params;
  return { title: `Edit - ${registerFromSegment(register).label}` };
}

export default async function EditRowPage({ params }: { params: Params<{ register: string; id: string }> }) {
  const { register, id } = await params;
  return <EditRowBody def={registerFromSegment(register)} id={id} />;
}

/** Edit one row of a register (shared with /projects/[id]/edit). */
export async function EditRowBody({ def, id }: { def: RegisterDef; id: string }) {
  return guarded(async () => {
    const actor = await requireActor();
    const [row, sources, history] = await Promise.all([getRow(actor, def.key, id), formSources(def), can(actor, "audit:read") ? historyFor(ENTITY_TYPE[def.key], id) : Promise.resolve([])]);
    const { fields, readOnly, options } = editableFields(actor, def);
    const canEdit = can(actor, def.manage) || (def.plan ? can(actor, def.plan) : false);
    const canDelete = can(actor, def.plan ?? def.manage);
    const name = String(row[def.nameField] ?? def.label);
    return (
      <>
        <PageHeader title={name} description={row.projectName ? `Project: ${row.projectName}` : undefined} crumbs={[{ label: "Registers" }, { label: def.label, href: def.path }, { label: name }]} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <Card>
              <CardBody>
                {canEdit ? (
                  <RegisterForm
                    action={updateRowAction}
                    fields={fields}
                    values={row}
                    sources={sources}
                    readOnly={readOnly}
                    options={options}
                    hidden={{ __register: def.key, id: row.id, version: String(row.version) }}
                    submitLabel="Save"
                    cancelHref={def.key === "projects" ? `/projects/${row.id}` : def.path}
                  />
                ) : (
                  <RegisterForm action={updateRowAction} fields={fields} values={row} sources={sources} readOnly={new Set(fields.map((f) => f.key))} hidden={{ __register: def.key, id: row.id, version: String(row.version) }} submitLabel="Read only" cancelHref={def.path} />
                )}
              </CardBody>
            </Card>
            {canDelete ? (
              <Card>
                <CardHeader title="Remove this row" description="The working standard says never delete history: set a status instead. Delete only a row entered by mistake." />
                <CardBody>
                  <ActionForm action={deleteRowAction}>
                    <input type="hidden" name="__register" value={def.key} />
                    <input type="hidden" name="id" value={row.id} />
                    <ConfirmSubmit title="Delete row?" description={`${name} will be removed from ${def.label}. The audit log keeps a copy.`} confirmLabel="Delete">
                      Delete row
                    </ConfirmSubmit>
                  </ActionForm>
                </CardBody>
              </Card>
            ) : null}
          </div>
          <HistoryPanel rows={history} />
        </div>
      </>
    );
  });
}
