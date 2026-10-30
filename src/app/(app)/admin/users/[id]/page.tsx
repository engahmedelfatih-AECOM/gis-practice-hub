import type { Metadata } from "next";
import { requireActor } from "@/application/auth/actor";
import { historyFor } from "@/application/audit/read";
import { getUser, listRoleAssignments } from "@/application/identity/users";
import { listValues } from "@/application/hub/lists";
import { ROLE_LABELS, type Role } from "@/domain/shared/enums";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { ActionForm } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { HistoryPanel } from "@/app/(app)/_components/history-panel";
import { guarded } from "@/app/_lib/page-guard";
import { param, type Params, type SearchParams } from "@/app/_lib/actions";
import { EditUserForm, GrantRoleForm, ResetPasswordForm } from "../user-forms";
import {
  grantRoleAction,
  resetPasswordAction,
  revokeRoleAction,
  updateUserAction,
} from "../actions";

export const metadata: Metadata = { title: "User" };

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Params<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  return guarded(async () => {
    const actor = await requireActor();
    const [user, roles, regions, history] = await Promise.all([
      getUser(actor, id),
      listRoleAssignments(actor, id),
      listValues("region"),
      historyFor("app_user", id),
    ]);
    const active = roles.filter((r) => !r.revokedAt);
    return (
      <>
        <PageHeader
          title={user.name}
          description={user.email}
          crumbs={[
            { label: "Administration" },
            { label: "Users & roles", href: "/admin/users" },
            { label: user.name },
          ]}
        />
        {param(sp, "created") ? (
          <Alert tone="ok" className="mb-4">
            User created. Grant at least one role below, then share the temporary password securely.
          </Alert>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Roles"
                description="Permissions come only from these assignments. Revoking takes effect on the user's next request."
              />
              <CardBody className="space-y-4">
                <GrantRoleForm
                  action={grantRoleAction}
                  userId={user.id}
                  regions={regions.map((r) => ({ id: r.id, label: r.value }))}
                />
                {active.length ? (
                  <Table>
                    <THead>
                      <tr>
                        <TH>Role</TH>
                        <TH>Scope</TH>
                        <TH>Granted</TH>
                        <TH className="w-28" />
                      </tr>
                    </THead>
                    <TBody>
                      {active.map((r) => (
                        <TR key={r.id}>
                          <TD className="font-medium">{ROLE_LABELS[r.role as Role] ?? r.role}</TD>
                          <TD>
                            {r.scopeType === "GLOBAL" ? (
                              <Badge>Whole practice</Badge>
                            ) : (
                              <Badge tone="info">{r.scopeName ?? r.scopeType}</Badge>
                            )}
                          </TD>
                          <TD className="text-gray-600">{formatDateTime(r.grantedAt)}</TD>
                          <TD className="text-right">
                            <ActionForm action={revokeRoleAction} className="inline">
                              <input type="hidden" name="id" value={r.id} />
                              <input type="hidden" name="userId" value={user.id} />
                              <ConfirmSubmit
                                size="sm"
                                variant="ghost"
                                title="Revoke role?"
                                description={`${user.name} will lose ${ROLE_LABELS[r.role as Role] ?? r.role} access${r.scopeName ? ` for ${r.scopeName}` : ""}.`}
                                confirmLabel="Revoke"
                              >
                                Revoke
                              </ConfirmSubmit>
                            </ActionForm>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                ) : (
                  <Alert tone="warn">This user has no roles and can only see the home page.</Alert>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Account" />
              <CardBody>
                <EditUserForm
                  action={updateUserAction}
                  user={{ id: user.id, name: user.name, isActive: user.isActive }}
                  isSelf={user.id === actor.userId}
                />
              </CardBody>
            </Card>
            {user.authProvider === "LOCAL" ? (
              <Card>
                <CardHeader
                  title="Password"
                  description={
                    user.mustChangePassword
                      ? "The user must change their password at next sign-in."
                      : undefined
                  }
                />
                <CardBody>
                  <ResetPasswordForm action={resetPasswordAction} userId={user.id} />
                </CardBody>
              </Card>
            ) : null}
          </div>
          <HistoryPanel rows={history} />
        </div>
      </>
    );
  });
}
