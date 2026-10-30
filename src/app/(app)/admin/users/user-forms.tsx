"use client";

import { ROLE_LABELS, ROLE_SCOPES, ROLES, type Role } from "@/domain/shared/enums";
import { ButtonLink } from "@/components/ui/button";
import { Checkbox, Input, Select } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/form";
import type { ActionState } from "@/components/ui/action-state";
import { useState } from "react";

type Action = (prev: ActionState, fd: FormData) => Promise<ActionState>;
export interface Option {
  id: string;
  label: string;
}

export function CreateUserForm({ action }: { action: Action }) {
  return (
    <ActionForm action={action} className="max-w-lg">
      <FormMessage />
      <Field name="email" label="Work e-mail" hint="Used to sign in. Must be unique." required>
        {(p) => <Input {...p} type="email" autoComplete="off" required />}
      </Field>
      <Field name="name" label="Full name" required>
        {(p) => <Input {...p} maxLength={120} required />}
      </Field>
      <Field
        name="temporaryPassword"
        label="Temporary password"
        hint="At least 12 characters. Share it securely; the user must change it at first sign-in."
        required
      >
        {(p) => <Input {...p} type="password" autoComplete="new-password" required />}
      </Field>
      <div className="flex gap-2">
        <SubmitButton pendingText="Creating…">Create user</SubmitButton>
        <ButtonLink href="/admin/users" variant="secondary">
          Cancel
        </ButtonLink>
      </div>
    </ActionForm>
  );
}

export function EditUserForm({
  action,
  user,
  isSelf,
}: {
  action: Action;
  user: { id: string; name: string; isActive: boolean };
  isSelf: boolean;
}) {
  return (
    <ActionForm action={action} className="max-w-lg">
      <FormMessage />
      <input type="hidden" name="id" value={user.id} />
      <Field name="name" label="Full name" required>
        {(p) => <Input {...p} defaultValue={user.name} maxLength={120} required />}
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="isActive" defaultChecked={user.isActive} disabled={isSelf} />
        Active{" "}
        {isSelf ? (
          <span className="text-xs text-gray-500">(you cannot deactivate yourself)</span>
        ) : (
          <span className="text-xs text-gray-500">
            - deactivating signs the user out everywhere immediately
          </span>
        )}
      </label>
      <SubmitButton pendingText="Saving…">Save</SubmitButton>
    </ActionForm>
  );
}

export function ResetPasswordForm({ action, userId }: { action: Action; userId: string }) {
  return (
    <ActionForm action={action} className="max-w-lg">
      <FormMessage />
      <input type="hidden" name="id" value={userId} />
      <Field
        name="temporaryPassword"
        label="New temporary password"
        hint="Revokes all of the user's sessions and forces a change at next sign-in."
        required
      >
        {(p) => <Input {...p} type="password" autoComplete="new-password" required />}
      </Field>
      <SubmitButton variant="secondary" pendingText="Resetting…">
        Set temporary password
      </SubmitButton>
    </ActionForm>
  );
}

export function GrantRoleForm({
  action,
  userId,
  regions,
}: {
  action: Action;
  userId: string;
  regions: Option[];
}) {
  const [role, setRole] = useState<Role>("GIS_SPECIALIST");
  const scopes = ROLE_SCOPES[role];
  const [scopeType, setScopeType] = useState<string>(scopes[0] ?? "GLOBAL");
  const effectiveScope = scopes.includes(scopeType as never) ? scopeType : scopes[0]!;
  return (
    <ActionForm
      action={action}
      className="grid gap-3 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end"
    >
      <input type="hidden" name="userId" value={userId} />
      <Field name="role" label="Role" required>
        {(p) => (
          <Select
            {...p}
            value={role}
            onChange={(e) => {
              const r = e.target.value as Role;
              setRole(r);
              setScopeType(ROLE_SCOPES[r][0]!);
            }}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field name="scopeType" label="Scope" required>
        {(p) => (
          <Select {...p} value={effectiveScope} onChange={(e) => setScopeType(e.target.value)}>
            {scopes.map((s) => (
              <option key={s} value={s}>
                {s === "GLOBAL" ? "Whole practice" : "One region (hub)"}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {effectiveScope === "REGION" ? (
        <Field name="scopeId" label="Region" required>
          {(p) => (
            <Select {...p} name="regionScopeId" defaultValue="">
              <option value="" disabled>
                Choose...
              </option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : (
        <p className="pb-2 text-sm text-gray-600">Applies to every project and region.</p>
      )}
      <SubmitButton variant="secondary" pendingText="Granting…">
        Grant role
      </SubmitButton>
      <div className="sm:col-span-4">
        <FormMessage />
      </div>
    </ActionForm>
  );
}
