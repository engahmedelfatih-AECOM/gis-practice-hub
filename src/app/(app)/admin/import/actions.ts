"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/application/auth/actor";
import { importClientSchema, importHubWorkbook, removeAllHubData, type ImportSummary } from "@/application/hub/import";
import type { ActionState } from "@/components/ui/action-state";
import { act } from "@/app/_lib/actions";

async function fileOf(fd: FormData): Promise<{ name: string; buffer: Buffer }> {
  const f = fd.get("file");
  if (!(f instanceof File) || f.size === 0) throw new Error("Choose an .xlsx file.");
  return { name: f.name, buffer: Buffer.from(await f.arrayBuffer()) };
}

function describe(s: ImportSummary): string {
  const lines = s.registers.map((r) => `${r.sheet}: ${r.found ? `${r.rows} rows, ${r.inserted} new, ${r.updated} updated` : "sheet not found"}`);
  lines.push(`Lists: ${s.lists} new values. Periods: ${s.periods}. Workflows: ${s.workflows} projects.`);
  if (s.warnings.length) lines.push(`Warnings:\n- ${s.warnings.slice(0, 15).join("\n- ")}${s.warnings.length > 15 ? `\n- and ${s.warnings.length - 15} more` : ""}`);
  return `${s.dryRun ? "Dry run - nothing was written." : "Import applied."}\n${lines.join("\n")}`;
}

export async function importHubAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const dryRun = fd.get("dryRun") === "on";
    const summary = await importHubWorkbook(await requireActor(), await fileOf(fd), dryRun);
    revalidatePath("/");
    return { message: describe(summary) };
  });
}

export async function importClientAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const dryRun = fd.get("dryRun") === "on";
    const s = await importClientSchema(await requireActor(), { clientName: fd.get("clientName") }, await fileOf(fd), dryRun);
    revalidatePath("/client-schemas");
    return { message: `${s.dryRun ? "Dry run - nothing was written." : "Import applied."}\n${s.clientName}: ${s.featureClasses} feature classes, ${s.fields} fields, ${s.subtypes} subtypes, ${s.domains} domains.` };
  });
}

export async function removeAllAction(): Promise<ActionState> {
  return act(async () => {
    await removeAllHubData(await requireActor());
    revalidatePath("/");
    return { message: "All register data removed." };
  });
}
