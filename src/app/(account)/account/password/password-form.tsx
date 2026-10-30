"use client";

import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/form";
import type { ActionState } from "@/components/ui/action-state";

export function PasswordForm({
  action,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  return (
    <ActionForm action={action}>
      <FormMessage />
      <Field name="currentPassword" label="Current password" required>
        {(p) => <Input {...p} type="password" autoComplete="current-password" required />}
      </Field>
      <Field
        name="newPassword"
        label="New password"
        hint="At least 12 characters, with letters and at least one number or symbol."
        required
      >
        {(p) => <Input {...p} type="password" autoComplete="new-password" required />}
      </Field>
      <Field name="confirmPassword" label="Confirm new password" required>
        {(p) => <Input {...p} type="password" autoComplete="new-password" required />}
      </Field>
      <SubmitButton pendingText="Saving…">Change password</SubmitButton>
    </ActionForm>
  );
}
