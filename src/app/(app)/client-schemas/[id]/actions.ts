"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/application/auth/actor";
import { updateClientSchema, updateFeatureClass } from "@/application/hub/client-schemas";
import { formToObject } from "@/application/shared/guard";
import type { ActionState } from "@/components/ui/action-state";
import { act } from "@/app/_lib/actions";

export async function updateFeatureClassAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await updateFeatureClass(await requireActor(), formToObject(fd));
    revalidatePath("/client-schemas");
    return { message: "Feature class saved." };
  });
}

export async function updateSchemaAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await updateClientSchema(await requireActor(), formToObject(fd));
    revalidatePath("/client-schemas");
    return { message: "Saved." };
  });
}
