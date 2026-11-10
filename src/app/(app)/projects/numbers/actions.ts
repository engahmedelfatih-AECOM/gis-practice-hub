"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/application/auth/actor";
import { setProjectNumbers } from "@/application/hub/registers";
import { formToObject } from "@/application/shared/guard";
import type { ActionState } from "@/components/ui/action-state";
import { act } from "@/app/_lib/actions";

export async function saveProjectNumbersAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const n = await setProjectNumbers(await requireActor(), formToObject(fd));
    revalidatePath("/projects");
    revalidatePath("/projects/numbers");
    return { message: n === 0 ? "Nothing to save: no number changed." : `${n} project ${n === 1 ? "number" : "numbers"} saved.` };
  });
}
