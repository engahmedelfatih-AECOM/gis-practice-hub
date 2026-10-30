/** Shape returned by every server action that backs a form. */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; message?: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

export const idleState: ActionState = { status: "idle" };
