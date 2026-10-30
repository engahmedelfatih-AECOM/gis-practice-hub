"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/application/auth/actor";
import { createApiKey, revokeApiKey } from "@/application/integration/api-keys";
import type { ActionState } from "@/components/ui/action-state";
import { act } from "@/app/_lib/actions";

export async function createApiKeyAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const { key, row } = await createApiKey(await requireActor(), { name: fd.get("name") });
    revalidatePath("/admin/api-keys");
    return {
      message: `Key "${row.name}" created. Copy it now, it is shown only once: ${key}`,
    };
  });
}

export async function revokeApiKeyAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await revokeApiKey(await requireActor(), String(fd.get("id")));
    revalidatePath("/admin/api-keys");
    return { message: "Key revoked." };
  });
}
