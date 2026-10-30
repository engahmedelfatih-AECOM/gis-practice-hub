/**
 * Error types raised by use cases. The HTTP/UI boundary maps them to
 * responses; nothing else in the application should throw raw strings.
 */
export type AppErrorCode =
  "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "VALIDATION" | "INVALID_TRANSITION";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: Record<string, string[]>;

  constructor(code: AppErrorCode, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
    this.status = STATUS[code];
  }
}

const STATUS: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
  INVALID_TRANSITION: 409,
};

export const unauthenticated = () => new AppError("UNAUTHENTICATED", "You must sign in.");
export const forbidden = (what = "perform this action") =>
  new AppError("FORBIDDEN", `You are not permitted to ${what}.`);
export const notFound = (entity: string) => new AppError("NOT_FOUND", `${entity} was not found.`);
export const conflict = (message: string) => new AppError("CONFLICT", message);
export const validation = (message: string, details?: Record<string, string[]>) =>
  new AppError("VALIDATION", message, details);

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
