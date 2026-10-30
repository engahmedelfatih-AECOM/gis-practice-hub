"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/application/auth/actor";
import { updateSetting } from "@/application/settings/settings";
import type { ActionState } from "@/components/ui/action-state";
import { act } from "@/app/_lib/actions";

export async function updateSettingAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const key = String(fd.get("key") ?? "");
    const raw = fd.get("value");
    let value: unknown = raw;
    if (key === "map.center") {
      value = { lat: Number(fd.get("lat")), lng: Number(fd.get("lng")), zoom: Number(fd.get("zoom")) };
    }
    await updateSetting(await requireActor(), key, value);
    revalidatePath("/admin/settings");
    return { message: "Setting saved." };
  });
}
