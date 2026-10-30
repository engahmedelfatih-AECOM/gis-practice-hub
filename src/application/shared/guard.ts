import "server-only";
import { z } from "zod";
import { can, type ResourceRef } from "@/domain/authz/policy";
import type { Action } from "@/domain/authz/permissions";
import type { Actor } from "@/application/auth/actor";
import { forbidden, validation } from "@/application/errors";

/** Throw 403 unless the actor may perform `action` on `resource`. */
export function assertCan(actor: Actor, action: Action, resource?: ResourceRef): void {
  if (!can(actor, action, resource)) throw forbidden(describe(action));
}

function describe(action: Action): string {
  const [entity, verb] = action.split(":");
  return `${verb} ${entity}`.replace(/([A-Z])/g, (m) => ` ${m.toLowerCase()}`);
}

/** Validate untrusted input with a Zod schema; raise a VALIDATION AppError with field details. */
export function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const details: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_form";
    (details[key] ??= []).push(issue.message);
  }
  throw validation("Please correct the highlighted fields.", details);
}

/** Convert a FormData into a plain object (repeated keys → arrays). */
export function formToObject(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith("$ACTION")) continue;
    if (key in out) {
      const existing = out[key];
      out[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      out[key] = value;
    }
  }
  return out;
}
