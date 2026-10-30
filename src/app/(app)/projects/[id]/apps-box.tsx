"use client";

import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { addAppAction, removeAppAction } from "./actions";

interface App {
  id: string;
  name: string;
  url: string | null;
}

/** GIS Enterprise Applications box of the update page (name and link per application). */
export function AppsBox({ projectId, apps, canEdit }: { projectId: string; apps: App[]; canEdit: boolean }) {
  return (
    <div>
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-earth-green text-white">
            <th className="px-2 py-1 text-left font-semibold">Application Name</th>
            <th className="px-2 py-1 text-left font-semibold">Link</th>
            {canEdit ? <th /> : null}
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {apps.map((a) => (
            <tr key={a.id} className="odd:bg-stone-gray-25">
              <td className="px-2 py-1">{a.name}</td>
              <td className="px-2 py-1">
                {a.url ? (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-brand-link hover:underline">
                    Open
                  </a>
                ) : (
                  "-"
                )}
              </td>
              {canEdit ? (
                <td className="px-2 py-1 text-right">
                  <ActionForm action={removeAppAction} className="inline">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <SubmitButton size="sm" variant="ghost">
                      Remove
                    </SubmitButton>
                  </ActionForm>
                </td>
              ) : null}
            </tr>
          ))}
          {apps.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-2 py-2 text-gray-500">
                None yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      {canEdit ? (
        <ActionForm action={addAppAction} className="mt-2 flex flex-wrap items-center gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          <Input name="name" placeholder="Application name" className="h-8 w-44 text-xs" />
          <Input name="url" placeholder="https://..." className="h-8 w-56 text-xs" />
          <SubmitButton size="sm" variant="secondary">
            Add
          </SubmitButton>
          <FormMessage />
        </ActionForm>
      ) : null}
    </div>
  );
}
