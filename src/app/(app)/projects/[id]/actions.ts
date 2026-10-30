"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/application/auth/actor";
import { addEnterpriseApp, addWorkflowStep, removeEnterpriseApp, removeWorkflowStep, resetWorkflow, updateWorkflowStep } from "@/application/hub/project-extras";
import { formToObject } from "@/application/shared/guard";
import type { ActionState } from "@/components/ui/action-state";
import { act } from "@/app/_lib/actions";

const back = (fd: FormData) => `/projects/${String(fd.get("projectId"))}`;

export async function updateStepAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await updateWorkflowStep(await requireActor(), formToObject(fd));
    revalidatePath(back(fd));
    return { message: "Step saved." };
  });
}

export async function addStepAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await addWorkflowStep(await requireActor(), formToObject(fd));
    revalidatePath(back(fd));
    return { message: "Step added." };
  });
}

export async function removeStepAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await removeWorkflowStep(await requireActor(), fd.get("id"));
    revalidatePath(back(fd));
    return { message: "Step removed." };
  });
}

export async function resetWorkflowAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await resetWorkflow(await requireActor(), fd.get("projectId"));
    revalidatePath(back(fd));
    return { message: "Workflow reset to the default steps." };
  });
}

export async function addAppAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await addEnterpriseApp(await requireActor(), formToObject(fd));
    revalidatePath(back(fd));
    return { message: "Application added." };
  });
}

export async function removeAppAction(_p: ActionState, fd: FormData): Promise<ActionState> {
  return act(async () => {
    await removeEnterpriseApp(await requireActor(), fd.get("id"));
    revalidatePath(back(fd));
    return { message: "Application removed." };
  });
}
