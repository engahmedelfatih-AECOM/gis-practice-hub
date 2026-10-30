"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/application/auth/actor";
import { createPeriod, deletePeriod, regeneratePeriods, updatePeriod } from "@/application/hub/periods";
import { formToObject } from "@/application/shared/guard";
import type { ActionState } from "@/components/ui/action-state";
import { act } from "@/app/_lib/actions";

const done = (message: string) => {
  revalidatePath("/admin/periods");
  revalidatePath("/");
  return { message };
};

export async function addPeriodAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await createPeriod(await requireActor(), formToObject(fd));
    return done("Period added.");
  });
}

export async function regeneratePeriodsAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const n = await regeneratePeriods(await requireActor(), formToObject(fd));
    return done(`${n} periods created.`);
  });
}

export async function updatePeriodAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await updatePeriod(await requireActor(), formToObject(fd));
    return done("Period saved.");
  });
}

export async function deletePeriodAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await deletePeriod(await requireActor(), fd.get("id"));
    return done("Period deleted.");
  });
}
