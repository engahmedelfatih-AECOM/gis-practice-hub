"use server";

import { requireActor } from "@/application/auth/actor";
import { changeOwnPassword } from "@/application/identity/users";
import { formToObject } from "@/application/shared/guard";
import type { ActionState } from "@/components/ui/action-state";
import { act } from "@/app/_lib/actions";

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return act(async () => {
    const actor = await requireActor();
    await changeOwnPassword(actor, formToObject(formData));
    return "/?password=changed";
  });
}
