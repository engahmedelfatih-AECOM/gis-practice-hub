import { z } from "zod";

/** Reusable field schemas so every form and use case validates identically. */
export const uuidSchema = z.uuid({ message: "Invalid identifier." });
export const codeSchema = z
  .string()
  .trim()
  .min(1, "Code is required.")
  .max(20, "Code must be 20 characters or fewer.")
  .regex(/^[A-Z0-9][A-Z0-9_-]*$/i, "Use letters, numbers, hyphen or underscore only.")
  .transform((s) => s.toUpperCase());
export const nameSchema = z.string().trim().min(1, "Name is required.").max(120);
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((s) => (s ? s : null));
export const isoDateSchema = z.iso.date({ message: "Use the format YYYY-MM-DD." });
export const optionalIsoDate = isoDateSchema
  .optional()
  .or(z.literal(""))
  .transform((s) => (s ? s : null));
export const versionSchema = z.coerce.number().int().min(1);
export const booleanFromForm = z
  .union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(200).default(25),
});
export type Pagination = z.infer<typeof paginationSchema>;

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Numeric string from forms → number with bounds. */
export const hoursSchema = z.coerce.number().min(0).max(24);
