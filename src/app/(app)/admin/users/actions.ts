"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/application/auth/actor";
import {
  createUser,
  grantRole,
  resetUserPassword,
  revokeRole,
  updateUser,
} from "@/application/identity/users";
import { formToObject } from "@/application/shared/guard";
import type { ActionState } from "@/components/ui/action-state";
import { act } from "@/app/_lib/actions";

export async function createUserAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const { id } = await createUser(await requireActor(), formToObject(fd));
    revalidatePath("/admin/users");
    return `/admin/users/${id}?created=1`;
  });
}

export async function updateUserAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await updateUser(await requireActor(), formToObject(fd));
    revalidatePath("/admin/users");
    return { message: "User saved." };
  });
}

export async function resetPasswordAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await resetUserPassword(await requireActor(), formToObject(fd));
    return {
      message:
        "Temporary password set. The user has been signed out everywhere and must change it at next sign-in.",
    };
  });
}

export async function grantRoleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    const obj = formToObject(fd);
    // The form has one select per scope type; pick the one matching the chosen scope.
    const scopeType = String(obj.scopeType ?? "");
    obj.scopeId = scopeType === "REGION" ? obj.regionScopeId : "";
    await grantRole(await requireActor(), obj);
    revalidatePath(`/admin/users/${String(obj.userId)}`);
    return { message: "Role granted." };
  });
}

export async function revokeRoleAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await revokeRole(await requireActor(), fd.get("id"));
    revalidatePath(`/admin/users/${String(fd.get("userId"))}`);
    return { message: "Role revoked." };
  });
}
