import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Password policy for local accounts (NIST SP 800-63B style: length first,
 * no forced composition rules beyond a basic variety check, block trivial values).
 */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`)
  .refine((p) => !/^(.)\1+$/.test(p), "Password cannot be a single repeated character.")
  .refine(
    (p) => /[a-zA-Z]/.test(p) && /[^a-zA-Z]/.test(p),
    "Password must contain letters and at least one number or symbol.",
  )
  .refine((p) => !COMMON.has(p.toLowerCase()), "That password is too common.");

const COMMON = new Set([
  "password1234",
  "passwordpassword",
  "123456789012",
  "qwertyuiop12",
  "welcome12345",
  "administrator",
]);
