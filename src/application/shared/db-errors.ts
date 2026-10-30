import "server-only";
import { conflict, validation, type AppError } from "@/application/errors";

interface PgError {
  code?: string;
  constraint_name?: string;
  constraint?: string;
  detail?: string;
  message?: string;
}

/**
 * Translate PostgreSQL constraint violations into user-facing application
 * errors. Constraint names are chosen in the schema to read well here.
 */
export function translateDbError(err: unknown): AppError | null {
  const e = unwrap(err);
  if (!e || typeof e !== "object" || !e.code) return null;
  const constraint = e.constraint_name ?? e.constraint ?? "";
  switch (e.code) {
    case "23505": // unique_violation
      return conflict(uniqueMessage(constraint));
    case "23503": // foreign_key_violation
      return conflict(
        constraint.includes("_fk") || e.detail?.includes("still referenced")
          ? "This record is referenced by other records and cannot be removed."
          : "A referenced record does not exist.",
      );
    case "23514": // check_violation
      return validation(checkMessage(constraint));
    case "23P01": // exclusion_violation
      return conflict("The period overlaps an existing period for the same record.");
    case "42501": // insufficient_privilege (append-only triggers)
      return conflict("This record is append-only and cannot be changed.");
    default:
      return null;
  }
}

/** Drizzle wraps driver errors in DrizzleQueryError; the PostgreSQL error is on `cause`. */
function unwrap(err: unknown): PgError | null {
  let cur: unknown = err;
  for (let depth = 0; depth < 5 && cur && typeof cur === "object"; depth++) {
    const e = cur as PgError & { cause?: unknown };
    if (typeof e.code === "string" && /^[0-9A-Z]{5}$/.test(e.code)) return e;
    cur = e.cause;
  }
  return null;
}

function uniqueMessage(constraint: string): string {
  if (constraint.includes("email")) return "That e-mail address is already in use.";
  if (constraint.includes("code")) return "That code is already in use.";
  if (constraint.includes("number")) return "That number is already in use.";
  if (constraint.includes("name")) return "That name is already in use.";
  if (constraint.includes("role_assignment"))
    return "This role is already assigned with the same scope.";
  if (constraint.includes("project_member")) return "This user is already a member of the project.";
  if (constraint.includes("single_default")) return "There is already a default calendar.";
  if (constraint.includes("public_holiday")) return "A holiday already exists on that date.";
  if (constraint.includes("employee_user"))
    return "That login is already linked to another employee.";
  return "A record with the same unique value already exists.";
}

function checkMessage(constraint: string): string {
  if (constraint === "employee_team_discipline_chk")
    return "The employee's discipline must match the team's discipline.";
  if (constraint === "team_discipline_change_chk")
    return "A team's discipline cannot change while employees are assigned to it.";
  if (constraint.includes("dates")) return "The end date must be on or after the start date.";
  return "The record violates a business rule.";
}
