import type { Metadata } from "next";
import { requireActor } from "@/application/auth/actor";
import { projectsView } from "@/application/hub/views";
import { assertCan } from "@/application/shared/guard";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { guarded } from "@/app/_lib/page-guard";
import { saveProjectNumbersAction } from "./actions";

export const metadata: Metadata = { title: "Project numbers" };

/**
 * One screen to fill the Project Number of the projects already in the Hub. The number is the
 * one the Resource Planner uses; it becomes the shared key between the two applications.
 */
export default async function ProjectNumbersPage() {
  return guarded(async () => {
    const actor = await requireActor();
    assertCan(actor, "project:manage");
    const { rows } = await projectsView(actor);
    const missing = rows.filter((p) => !p.projectNumber).length;
    return (
      <>
        <PageHeader
          title="Project numbers"
          description="Type the Project Number of each project, as it is in the Resource Planner. Each number belongs to one project. Leave a field empty when the number is not known yet."
          crumbs={[{ label: "Registers" }, { label: "Projects", href: "/projects" }, { label: "Project numbers" }]}
          actions={
            <ButtonLink href="/projects" variant="secondary">
              Back to Projects
            </ButtonLink>
          }
        />
        <p className="mb-3 text-sm text-gray-600">
          {rows.length} projects, {missing} without a number.
        </p>
        <ActionForm action={saveProjectNumbersAction}>
          <Table>
            <THead>
              <tr>
                <TH className="w-12">#</TH>
                <TH>Project Name</TH>
                <TH>Client</TH>
                <TH>Job No.</TH>
                <TH className="w-72">Project Number</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((p, i) => (
                <TR key={p.id}>
                  <TD className="text-gray-500">{i + 1}</TD>
                  <TD className="font-medium">{p.name}</TD>
                  <TD>{p.client}</TD>
                  <TD>{p.jobNo}</TD>
                  <TD>
                    <Input name={`number:${p.id}`} defaultValue={p.projectNumber ?? ""} maxLength={60} className="h-9" aria-label={`Project Number of ${p.name}`} />
                  </TD>
                </TR>
              ))}
              {rows.length === 0 ? (
                <TR>
                  <TD colSpan={5} className="py-8 text-center text-gray-500">
                    No projects yet.
                  </TD>
                </TR>
              ) : null}
            </TBody>
          </Table>
          <div className="mt-4 flex items-center gap-3">
            <SubmitButton>Save numbers</SubmitButton>
            <FormMessage />
          </div>
        </ActionForm>
      </>
    );
  });
}
