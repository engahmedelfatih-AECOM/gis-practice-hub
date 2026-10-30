import { z } from "zod";
import { ROLES, ROLE_SCOPES, SCOPE_TYPES } from "@/domain/shared/enums";
import { booleanFromForm, nameSchema, uuidSchema } from "@/domain/shared/schema";
import { passwordSchema } from "@/domain/auth/password";

export const userCreateInput = z.object({
  email: z.email("Enter a valid e-mail address.").transform((s) => s.toLowerCase()),
  name: nameSchema,
  /** Temporary password set by the Administrator; the user must change it at first sign-in. */
  temporaryPassword: passwordSchema,
});
export type UserCreateInput = z.infer<typeof userCreateInput>;

export const userUpdateInput = z.object({
  id: uuidSchema,
  name: nameSchema,
  isActive: booleanFromForm,
});
export type UserUpdateInput = z.infer<typeof userUpdateInput>;

export const userResetPasswordInput = z.object({
  id: uuidSchema,
  temporaryPassword: passwordSchema,
});

export const changeOwnPasswordInput = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const roleAssignmentInput = z
  .object({
    userId: uuidSchema,
    role: z.enum(ROLES),
    scopeType: z.enum(SCOPE_TYPES),
    scopeId: uuidSchema
      .optional()
      .or(z.literal(""))
      .transform((s) => (s ? s : null)),
  })
  .refine((v) => ROLE_SCOPES[v.role].includes(v.scopeType), {
    message: "That role cannot be granted with this scope type.",
    path: ["scopeType"],
  })
  .refine((v) => (v.scopeType === "GLOBAL") === (v.scopeId === null), {
    message: "Choose a region for a region-scoped role; leave empty for a global role.",
    path: ["scopeId"],
  });
export type RoleAssignmentInput = z.infer<typeof roleAssignmentInput>;
