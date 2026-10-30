import type { Metadata } from "next";
import { requireActor } from "@/application/auth/actor";
import { formSources } from "@/application/hub/registers";
import { can } from "@/domain/authz/policy";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { RegisterForm } from "@/components/hub/register-form";
import { AccessDenied, guarded } from "@/app/_lib/page-guard";
import { param, type Params, type SearchParams } from "@/app/_lib/actions";
import { registerFromSegment } from "../_lib";
import type { RegisterDef } from "@/domain/hub/registers";
import { createRowAction } from "../actions";

export async function generateMetadata({ params }: { params: Params<{ register: string }> }): Promise<Metadata> {
  const { register } = await params;
  return { title: `New - ${registerFromSegment(register).label}` };
}

export default async function NewRowPage({ params, searchParams }: { params: Params<{ register: string }>; searchParams: SearchParams }) {
  const { register } = await params;
  return <NewRowBody def={registerFromSegment(register)} sp={await searchParams} />;
}

/** New row form of a register (shared with /projects/new). */
export async function NewRowBody({ def, sp }: { def: RegisterDef; sp: Record<string, string | string[] | undefined> }) {
  return guarded(async () => {
    const actor = await requireActor();
    if (!can(actor, def.plan ?? def.manage)) return <AccessDenied message={`Adding rows to ${def.label} is for the roles named in the working standard.`} />;
    const sources = await formSources(def);
    const values: Record<string, unknown> = { projectId: param(sp, "project") ?? "", status: def.key === "packages" || def.key === "projects" ? "Not Started" : def.key === "risks" || def.key === "rfis" ? "Open" : "" };
    if (def.key === "updates") values.dateEntered = new Date().toISOString().slice(0, 10);
    return (
      <>
        <PageHeader title={`New row - ${def.label}`} crumbs={[{ label: "Registers" }, { label: def.label, href: def.path }, { label: "New" }]} />
        <Card>
          <CardBody>
            <RegisterForm action={createRowAction} fields={def.fields} values={values} sources={sources} hidden={{ __register: def.key }} submitLabel="Add row" cancelHref={def.path} />
          </CardBody>
        </Card>
      </>
    );
  });
}
