"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { addStepAction, removeStepAction, resetWorkflowAction, updateStepAction } from "./actions";

interface Step {
  id: string;
  stepNo: number;
  name: string;
  status: string;
}

const DOT: Record<string, string> = {
  Completed: "bg-lime-green text-gray-900",
  "In Progress": "bg-sunrise-yellow text-gray-900",
  "Not Started": "bg-black text-white",
};

/** The GIS delivery workflow band at the foot of the update page: numbered circles with a status colour. */
export function WorkflowBand({ projectId, steps, canEdit }: { projectId: string; steps: Step[]; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  return (
    <section className="bg-earth-green rounded-lg p-4 text-white">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">GIS delivery workflow</h2>
        <div className="flex items-center gap-3 text-xs">
          <Legend tone="Completed" label="Completed / Approved" />
          <Legend tone="In Progress" label="In progress" />
          <Legend tone="Not Started" label="Not started" />
          {canEdit ? (
            <Button size="sm" variant="secondary" onClick={() => setEditing((v) => !v)}>
              {editing ? "Close editor" : "Edit steps"}
            </Button>
          ) : null}
        </div>
      </div>
      <ol className="mt-4 flex flex-wrap gap-x-2 gap-y-4">
        {steps.map((s, i) => (
          <li key={s.id} className="flex w-28 flex-col items-center text-center">
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold", DOT[s.status] ?? DOT["Not Started"])}>{i + 1}</span>
            <span className="mt-1 text-[11px] leading-tight">{s.name}</span>
          </li>
        ))}
      </ol>
      {editing && canEdit ? (
        <div className="mt-4 space-y-2 rounded-md bg-white p-3 text-gray-900">
          {steps.map((s) => (
            <ActionForm key={s.id} action={updateStepAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={s.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <span className="w-6 text-xs text-gray-500">{s.stepNo}</span>
              <Input name="name" defaultValue={s.name} className="h-8 w-80 text-xs" />
              <Select name="status" defaultValue={s.status} className="h-8 w-36 text-xs">
                <option>Completed</option>
                <option>In Progress</option>
                <option>Not Started</option>
              </Select>
              <SubmitButton size="sm" variant="secondary">
                Save
              </SubmitButton>
              <FormMessage />
              <RemoveStep id={s.id} projectId={projectId} />
            </ActionForm>
          ))}
          <ActionForm action={addStepAction} className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
            <input type="hidden" name="projectId" value={projectId} />
            <Input name="name" placeholder="New step name" className="h-8 w-80 text-xs" />
            <SubmitButton size="sm">Add step</SubmitButton>
            <FormMessage />
          </ActionForm>
          <ActionForm action={resetWorkflowAction} className="inline">
            <input type="hidden" name="projectId" value={projectId} />
            <SubmitButton size="sm" variant="ghost">
              Reset to the default AECOM workflow
            </SubmitButton>
          </ActionForm>
        </div>
      ) : null}
    </section>
  );
}

function RemoveStep({ id, projectId }: { id: string; projectId: string }) {
  return (
    <ActionForm action={removeStepAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="projectId" value={projectId} />
      <SubmitButton size="sm" variant="ghost">
        Remove
      </SubmitButton>
    </ActionForm>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cn("inline-block h-3 w-3 rounded-full", DOT[tone])} /> {label}
    </span>
  );
}
