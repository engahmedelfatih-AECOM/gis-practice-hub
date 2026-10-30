"use client";

import { ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import { updateFeatureClassAction, updateSchemaAction } from "./actions";

export function SchemaHeaderForm({ schema }: { schema: { id: string; version: number; gisLead: string | null; schemaVersion: string | null; notes: string | null } }) {
  return (
    <ActionForm action={updateSchemaAction} className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end">
      <input type="hidden" name="id" value={schema.id} />
      <input type="hidden" name="version" value={schema.version} />
      <Field name="gisLead" label="GIS lead">
        {(p) => <Input {...p} defaultValue={schema.gisLead ?? ""} />}
      </Field>
      <Field name="schemaVersion" label="Schema version">
        {(p) => <Input {...p} defaultValue={schema.schemaVersion ?? ""} />}
      </Field>
      <Field name="notes" label="Notes">
        {(p) => <Input {...p} defaultValue={schema.notes ?? ""} />}
      </Field>
      <SubmitButton variant="secondary" pendingText="Saving...">
        Save
      </SubmitButton>
      <div className="md:col-span-4">
        <FormMessage />
      </div>
    </ActionForm>
  );
}

export function FeatureClassForm({
  row,
  geometry,
  disciplines,
  people,
  cancelHref,
}: {
  row: Record<string, unknown> & { id: string; version: number };
  geometry: string[];
  disciplines: string[];
  people: string[];
  cancelHref: string;
}) {
  const v = (k: string) => (row[k] === null || row[k] === undefined ? "" : String(row[k]));
  return (
    <ActionForm action={updateFeatureClassAction}>
      <FormMessage />
      <input type="hidden" name="id" value={row.id} />
      <input type="hidden" name="version" value={row.version} />
      <div className="grid gap-4 md:grid-cols-3">
        <Field name="geometryType" label="Geometry Type">
          {(p) => (
            <>
              <Input {...p} list="fc-geometry" defaultValue={v("geometryType")} />
              <datalist id="fc-geometry">{geometry.map((g) => <option key={g} value={g} />)}</datalist>
            </>
          )}
        </Field>
        <Field name="discipline" label="Discipline">
          {(p) => (
            <>
              <Input {...p} list="fc-disc" defaultValue={v("discipline")} />
              <datalist id="fc-disc">{disciplines.map((g) => <option key={g} value={g} />)}</datalist>
            </>
          )}
        </Field>
        <Field name="disciplineIndividual" label="Discipline Individual">
          {(p) => (
            <>
              <Input {...p} list="fc-people" defaultValue={v("disciplineIndividual")} />
              <datalist id="fc-people">{people.map((g) => <option key={g} value={g} />)}</datalist>
            </>
          )}
        </Field>
        <Field name="availability" label="Available / Unavailable">
          {(p) => (
            <Select {...p} defaultValue={v("availability")}>
              <option value="">-</option>
              {["Available", "Unavailable", "Partial", "Not Required"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field name="status" label="Status">
          {(p) => (
            <Select {...p} defaultValue={v("status")}>
              <option value="">-</option>
              {["Not Started", "In Progress", "Delivered", "Client Review", "Approved", "On Hold"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          )}
        </Field>
        <div />
        <Field name="gisComments" label="GIS Comments" className="md:col-span-3">
          {(p) => <Textarea {...p} defaultValue={v("gisComments")} />}
        </Field>
        <Field name="notes" label="Notes" className="md:col-span-3">
          {(p) => <Textarea {...p} defaultValue={v("notes")} />}
        </Field>
        <Field name="sourceFileUrl" label="Source File Link (paste URL)">
          {(p) => <Input {...p} type="url" defaultValue={v("sourceFileUrl")} />}
        </Field>
        <Field name="shareFolderUrl" label="Share Folder Link (paste URL)">
          {(p) => <Input {...p} type="url" defaultValue={v("shareFolderUrl")} />}
        </Field>
      </div>
      <div className="flex gap-2">
        <SubmitButton pendingText="Saving...">Save</SubmitButton>
        <ButtonLink href={cancelHref} variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </ActionForm>
  );
}
