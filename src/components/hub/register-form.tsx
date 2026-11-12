"use client";

import type { FieldDef } from "@/domain/hub/registers";
import type { ListKey } from "@/domain/shared/enums";
import { Field } from "@/components/ui/field";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";
import type { ActionState } from "@/components/ui/action-state";
import { ButtonLink } from "@/components/ui/button";

export interface FormSources {
  lists: Partial<Record<ListKey, string[]>>;
  people: string[];
  projects: { id: string; name: string }[];
}

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;

const PCT = Array.from({ length: 11 }, (_, i) => i * 10);

/**
 * One form for every register: the fields of the sheet, in sheet order, with the dropdowns of
 * the Lists sheet, the people of the Resources sheet and the browser date picker on every date.
 * Dropdowns that accept typed values in the workbook use a datalist here; strict ones a select.
 */
export function RegisterForm({
  action,
  fields,
  values,
  sources,
  readOnly,
  options,
  hidden,
  submitLabel,
  cancelHref,
  columns = 3,
  extraActions,
}: {
  action: Action;
  fields: FieldDef[];
  values: Record<string, unknown>;
  sources: FormSources;
  readOnly?: Set<string>;
  /** Narrower choices for this role (a GIS Specialist sets a status only up to Internal QA/QC). */
  options?: Record<string, readonly string[]>;
  hidden?: Record<string, string>;
  submitLabel: string;
  cancelHref: string;
  columns?: 2 | 3;
  /** More controls after Save and Cancel, such as Delete (bound to its own form by id). */
  extraActions?: React.ReactNode;
}) {
  return (
    <ActionForm action={action}>
      <FormMessage />
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className={columns === 3 ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "grid gap-4 md:grid-cols-2"}>
        {fields
          .filter((f) => !f.derived)
          .map((f) => (
            <Field
              key={f.key}
              name={f.key}
              label={f.label}
              required={f.required}
              hint={readOnly?.has(f.key) ? "Read-only for your role" : f.hint}
              className={f.type === "textarea" ? "md:col-span-2 xl:col-span-3" : undefined}
            >
              {(p) => (
                <>
                  <Control
                    field={f}
                    value={values[f.key]}
                    sources={sources}
                    disabled={readOnly?.has(f.key)}
                    allowed={options?.[f.key]}
                    p={p}
                  />
                  {/* A disabled control posts nothing, so the current value travels in a hidden
                      field: the row keeps it and the server still sees a complete row. */}
                  {readOnly?.has(f.key) ? (
                    <input type="hidden" name={f.key} value={values[f.key] === null || values[f.key] === undefined ? "" : String(values[f.key])} />
                  ) : null}
                </>
              )}
            </Field>
          ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton pendingText="Saving...">{submitLabel}</SubmitButton>
        <ButtonLink href={cancelHref} variant="secondary">
          Cancel
        </ButtonLink>
        {extraActions ? <span className="ml-auto">{extraActions}</span> : null}
      </div>
    </ActionForm>
  );
}

function Control({
  field: f,
  value,
  sources,
  disabled,
  allowed,
  p,
}: {
  field: FieldDef;
  value: unknown;
  sources: FormSources;
  disabled?: boolean;
  allowed?: readonly string[];
  p: { id: string; name: string; "aria-invalid": boolean; "aria-describedby": string | undefined };
}) {
  const v = value === null || value === undefined ? "" : String(value);
  // A control the role may not change is also left out of the tab order; its value is posted
  // by the hidden field beside it.
  const common = { ...p, disabled, readOnly: disabled, tabIndex: disabled ? -1 : undefined };
  switch (f.type) {
    case "textarea":
      return <Textarea {...common} defaultValue={v} maxLength={4000} />;
    case "date":
      return <Input {...common} type="date" defaultValue={v.slice(0, 10)} />;
    case "number":
      return <Input {...common} type="number" step="any" defaultValue={v} />;
    case "int":
      return <Input {...common} type="number" step="1" min={0} defaultValue={v || "0"} />;
    case "pct": {
      // The steps of the workbook dropdown (0 to 100 %, or 0 to 120 % for Utilisation).
      const steps = f.options ? [...f.options] : PCT.map(String);
      return (
        <Select {...common} defaultValue={v}>
          <option value="">-</option>
          {steps.map((n) => (
            <option key={n} value={n}>
              {n} %
            </option>
          ))}
          {v && !steps.includes(v) ? <option value={v}>{v} %</option> : null}
        </Select>
      );
    }
    case "url":
      return <Input {...common} type="url" placeholder="https://aecom.sharepoint.com/..." defaultValue={v} />;
    case "project":
      return (
        <Select {...common} defaultValue={v}>
          <option value="">{f.required ? "Choose a project" : "-"}</option>
          {sources.projects.map((pr) => (
            <option key={pr.id} value={pr.id}>
              {pr.name}
            </option>
          ))}
        </Select>
      );
    case "select": {
      const options = allowed
        ? [...allowed]
        : f.options
          ? [...f.options]
          : f.people
            ? sources.people
            : f.list
              ? (sources.lists[f.list] ?? [])
              : [];
      if (f.strict || allowed) {
        return (
          <Select {...common} defaultValue={v}>
            <option value="">{f.required ? "Choose..." : "-"}</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
            {v && !options.includes(v) ? <option value={v}>{v}</option> : null}
          </Select>
        );
      }
      const listId = `${p.id}-list`;
      return (
        <>
          <Input {...common} list={listId} defaultValue={v} autoComplete="off" />
          <datalist id={listId}>
            {options.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </>
      );
    }
    default:
      return <Input {...common} defaultValue={v} maxLength={500} />;
  }
}
