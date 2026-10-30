import "server-only";
import { redirect } from "next/navigation";
import { isAppError } from "@/application/errors";
import type { ActionState } from "@/components/ui/action-state";
import { logger } from "@/lib/logger";

export type ActionOutcome = string | void | { message: string };

/**
 * Run a use case from a server action and convert the outcome into form state.
 * - return a path  → redirect there after success
 * - return {message} → stay on the page and show a success message
 * Application errors become field/form errors; anything else is logged and
 * shown as a generic failure (never leak internals to the browser).
 */
export async function act(fn: () => Promise<ActionOutcome>): Promise<ActionState> {
  let outcome: ActionOutcome;
  try {
    outcome = await fn();
  } catch (err) {
    if (isAppError(err)) {
      if (err.code === "UNAUTHENTICATED") redirect("/login");
      return { status: "error", message: err.message, fieldErrors: err.details };
    }
    logger.error({ err }, "unhandled error in server action");
    return { status: "error", message: "Something went wrong. Please try again." };
  }
  if (typeof outcome === "string") redirect(outcome);
  if (outcome && typeof outcome === "object")
    return { status: "success", message: outcome.message };
  return { status: "success" };
}

/** Read a single string query parameter. */
export function param(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s ? s : null;
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export type Params<T extends Record<string, string>> = Promise<T>;
