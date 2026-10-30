"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/application/auth/actor";
import { createRow, deleteRow, moveRow, updateRow } from "@/application/hub/registers";
import { formToObject } from "@/application/shared/guard";
import { REGISTERS, type RegisterKey } from "@/domain/hub/registers";
import type { ActionState } from "@/components/ui/action-state";
import { act } from "@/app/_lib/actions";

function keyOf(fd: FormData): RegisterKey {
  const k = String(fd.get("__register") ?? "");
  if (!(k in REGISTERS)) throw new Error("Unknown register");
  return k as RegisterKey;
}

export async function createRowAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const key = keyOf(fd);
    const { id } = await createRow(await requireActor(), key, formToObject(fd));
    const def = REGISTERS[key];
    revalidatePath(def.path);
    revalidatePath("/");
    return key === "projects" ? `/projects/${id}?created=1` : `${def.path}?saved=1`;
  });
}

export async function updateRowAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const key = keyOf(fd);
    await updateRow(await requireActor(), key, formToObject(fd));
    const def = REGISTERS[key];
    revalidatePath(def.path);
    revalidatePath("/");
    const back = String(fd.get("__back") ?? "");
    return back || `${def.path}?saved=1`;
  });
}

export async function deleteRowAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const key = keyOf(fd);
    await deleteRow(await requireActor(), key, fd.get("id"));
    const def = REGISTERS[key];
    revalidatePath(def.path);
    revalidatePath("/");
    return `${def.path}?deleted=1`;
  });
}

export async function moveRowAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const key = keyOf(fd);
    await moveRow(await requireActor(), key, fd.get("id"), fd.get("direction") === "up" ? "up" : "down");
    revalidatePath(REGISTERS[key].path);
    return { message: "Row moved." };
  });
}
