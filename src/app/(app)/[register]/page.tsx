import type { Metadata } from "next";
import { requireActor } from "@/application/auth/actor";
import { PAGE_SIZE, countRows, listRows, rowUsage } from "@/application/hub/registers";
import { listProjectsBrief } from "@/application/hub/project-extras";
import { projectsView, registerExtras } from "@/application/hub/views";
import { can } from "@/domain/authz/policy";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Select, Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { RegisterTable, type ExtraColumn } from "@/components/hub/register-table";
import { guarded } from "@/app/_lib/page-guard";
import { param, type Params, type SearchParams } from "@/app/_lib/actions";
import { registerFromSegment } from "./_lib";
import { ProjectsRegister } from "./projects-register";
import { DeleteRowForm } from "./delete-row-form";

export async function generateMetadata({ params }: { params: Params<{ register: string }> }): Promise<Metadata> {
  const { register } = await params;
  return { title: registerFromSegment(register).label };
}

export default async function RegisterPage({ params, searchParams }: { params: Params<{ register: string }>; searchParams: SearchParams }) {
  const { register } = await params;
  const sp = await searchParams;
  const def = registerFromSegment(register);
  return guarded(async () => {
    const actor = await requireActor();
    const projectId = param(sp, "project");
    const q = param(sp, "q");
    const canEdit = can(actor, def.manage) || (def.plan ? can(actor, def.plan) : false);
    const canAdd = def.plan ? can(actor, def.plan) : can(actor, def.manage);
    const exportHref = `/api/export/register/${def.key}${projectId ? `?project=${projectId}` : ""}`;

    if (def.key === "projects") {
      const view = await projectsView(actor, param(sp, "period"));
      const usage = await rowUsage(actor, "projects", view.rows as unknown as Record<string, unknown>[]);
      const deleteNotes = usage ? Object.fromEntries([...usage].map(([id, u]) => [id, u.note])) : null;
      return (
        <ProjectsRegister
          view={view}
          canAdd={canAdd}
          saved={Boolean(param(sp, "saved"))}
          deleted={Boolean(param(sp, "deleted"))}
          exportHref={exportHref}
          deleteNotes={deleteNotes}
        />
      );
    }

    // One page at a time: the registers can hold thousands of rows after an import.
    const page = Math.max(1, Number(param(sp, "page") ?? "1") || 1);
    const [rows, total, projects] = await Promise.all([
      listRows(actor, def.key, { projectId, q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
      countRows(actor, def.key, { projectId, q }),
      listProjectsBrief(),
    ]);
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const pageHref = (n: number) => {
      const qs = new URLSearchParams();
      if (projectId) qs.set("project", projectId);
      if (q) qs.set("q", q);
      if (n > 1) qs.set("page", String(n));
      const s = qs.toString();
      return s ? `${def.path}?${s}` : def.path;
    };
    const extraFn = ["packages", "rfis", "qaqc", "resources", "updates"].includes(def.key)
      ? await registerExtras(def.key as "packages" | "rfis" | "qaqc" | "resources" | "updates")
      : null;
    const extras: ExtraColumn[] = extraFn
      ? Object.keys(extraFn(rows[0] ?? {})).map((label) => ({ label, value: (row) => extraFn(row)[label as never] as string }))
      : [];
    const hasProject = def.fields.some((f) => f.type === "project");
    const usage = await rowUsage(actor, def.key, rows);
    return (
      <>
        <PageHeader
          title={def.label}
          description={def.description}
          crumbs={[{ label: "Registers" }, { label: def.label }]}
          actions={
            <>
              <ButtonLink href={exportHref} variant="secondary">
                Export to Excel
              </ButtonLink>
              {canAdd ? <ButtonLink href={`${def.path}/new${projectId ? `?project=${projectId}` : ""}`}>Add row</ButtonLink> : null}
            </>
          }
        />
        {param(sp, "saved") ? <Alert tone="ok" className="mb-4">Row saved.</Alert> : null}
        {param(sp, "deleted") ? <Alert tone="ok" className="mb-4">Row deleted.</Alert> : null}
        {!canEdit ? <Alert tone="info" className="mb-4">You can read this register. Editing is for the roles named in the working standard.</Alert> : null}
        <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
          {hasProject ? (
            <div>
              <Label htmlFor="project" className="mb-1">
                Project
              </Label>
              <Select id="project" name="project" defaultValue={projectId ?? ""} className="w-64">
                <option value="">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <div>
            <Label htmlFor="q" className="mb-1">
              Search
            </Label>
            <Input id="q" name="q" defaultValue={q ?? ""} placeholder="Any text column" className="w-64" />
          </div>
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          <span className="pb-2 text-sm text-gray-500">
            {total} rows{pages > 1 ? ` - page ${page} of ${pages}` : ""}
          </span>
        </form>
        <RegisterTable
          fields={def.fields}
          rows={rows}
          extras={extras}
          editHref={(row) => `${def.path}/${row.id}`}
          rowLabel={(row) => String(row[def.nameField] ?? "")}
          startNumber={(page - 1) * PAGE_SIZE + 1}
          deleteCell={
            usage
              ? (row) => <DeleteRowForm register={def.key} id={String(row.id)} name={String(row[def.nameField] ?? "Row")} usedBy={usage.get(String(row.id))?.note ?? null} />
              : undefined
          }
        />
        {pages > 1 ? (
          <nav className="mt-4 flex items-center gap-2 text-sm" aria-label="Pages">
            {page > 1 ? (
              <ButtonLink href={pageHref(page - 1)} variant="secondary" size="sm">
                Previous
              </ButtonLink>
            ) : null}
            <span className="text-gray-600">
              Rows {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            {page < pages ? (
              <ButtonLink href={pageHref(page + 1)} variant="secondary" size="sm">
                Next
              </ButtonLink>
            ) : null}
          </nav>
        ) : null}
      </>
    );
  });
}
