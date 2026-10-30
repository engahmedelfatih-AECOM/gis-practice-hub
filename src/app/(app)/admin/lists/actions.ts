"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/application/auth/actor";
import { addListValue, deleteListValue, updateListValue } from "@/application/hub/lists";
import { formToObject } from "@/application/shared/guard";
import type { ActionState } from "@/components/ui/action-state";
import { act } from "@/app/_lib/actions";

export async function addListValueAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await addListValue(await requireActor(), formToObject(fd));
    revalidatePath("/admin/lists");
    return { message: "Value added." };
  });
}

export async function updateListValueAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await updateListValue(await requireActor(), formToObject(fd));
    revalidatePath("/admin/lists");
    return { message: "Saved." };
  });
}

export async function deleteListValueAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await deleteListValue(await requireActor(), fd.get("id"));
    revalidatePath("/admin/lists");
    return { message: "Deleted." };
  });
}
