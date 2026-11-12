import type { Metadata } from "next";
import { requireActor } from "@/application/auth/actor";
import { listAll } from "@/application/hub/lists";
import { LIST_KEYS, LIST_KEY_VALUES } from "@/domain/shared/enums";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DeleteControl } from "@/components/ui/delete-control";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/form";
import { Checkbox, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { guarded } from "@/app/_lib/page-guard";
import { addListValueAction, deleteListValueAction, updateListValueAction } from "./actions";

export const metadata: Metadata = { title: "Lists" };

/** The Lists sheet: one card per dropdown source. Add a value and every dropdown using it updates. */
export default async function ListsPage() {
  return guarded(async () => {
    const actor = await requireActor();
    const lists = await listAll(actor);
    return (
      <>
        <PageHeader
          title="Lists - dropdown sources"
          description="Edit or extend a list here and every dropdown using it updates. Keep the values exactly as the team types them; the Dashboard counts exact values."
          crumbs={[{ label: "Administration" }, { label: "Lists" }]}
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {LIST_KEY_VALUES.map((key) => (
            <Card key={key} id={key}>
              <CardHeader title={LIST_KEYS[key]} description={key === "discipline" ? "Group: Infrastructure, Masterplan or Urban Planning (U+P), drives the Discipline Group of a package." : undefined} />
              <CardBody className="space-y-2">
                <ul className="divide-border divide-y text-sm">
                  {lists[key].map((item) => (
                    <li key={item.id} className="flex items-start gap-2 py-1.5">
                      <ActionForm action={updateListValueAction} className="flex flex-1 flex-wrap items-center gap-2 space-y-0">
                        <input type="hidden" name="id" value={item.id} />
                        <span className="w-6 text-xs text-gray-400">{item.sortOrder}</span>
                        <Input name="value" defaultValue={item.value} className="h-8 w-64 text-xs" aria-label="Value" />
                        {key === "discipline" ? <Input name="group" defaultValue={item.group ?? ""} className="h-8 w-40 text-xs" placeholder="Group" aria-label="Group" /> : null}
                        <label className="flex items-center gap-1 text-xs">
                          <Checkbox name="isActive" defaultChecked={item.isActive} /> active
                        </label>
                        <SubmitButton size="sm" variant="secondary">
                          Save
                        </SubmitButton>
                        <FormMessage />
                      </ActionForm>
                      <ActionForm action={deleteListValueAction} className="space-y-1">
                        <input type="hidden" name="id" value={item.id} />
                        <DeleteControl mode="icon" name={`"${item.value}"`} usedBy={item.usedBy} description="It will no longer appear in dropdowns." />
                        <FormMessage />
                      </ActionForm>
                    </li>
                  ))}
                </ul>
                <ActionForm action={addListValueAction} className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
                  <input type="hidden" name="listKey" value={key} />
                  <Input name="value" placeholder="New value" className="h-8 w-64 text-xs" aria-label={`New ${LIST_KEYS[key]} value`} />
                  {key === "discipline" ? <Input name="group" placeholder="Group" className="h-8 w-40 text-xs" /> : null}
                  <SubmitButton size="sm">Add</SubmitButton>
                  <FormMessage />
                </ActionForm>
              </CardBody>
            </Card>
          ))}
        </div>
      </>
    );
  });
}
