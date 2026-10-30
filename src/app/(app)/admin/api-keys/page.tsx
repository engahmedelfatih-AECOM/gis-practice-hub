import type { Metadata } from "next";
import { requireActor } from "@/application/auth/actor";
import { listApiKeys } from "@/application/integration/api-keys";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { ActionForm } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { guarded } from "@/app/_lib/page-guard";
import { ApiKeyForm } from "./key-form";
import { createApiKeyAction, revokeApiKeyAction } from "./actions";

export const metadata: Metadata = { title: "API keys" };

export default async function ApiKeysPage() {
  return guarded(async () => {
    const actor = await requireActor();
    const keys = await listApiKeys(actor);
    return (
      <>
        <PageHeader
          title="API keys"
          description="Machine access to the read-only hub feed under /api/hub/v1 (projects, allocations, capacity). Send the key in the x-api-key header. Keys are hashed; the plain key is shown once."
          crumbs={[{ label: "Administration" }, { label: "API keys" }]}
        />
        <Card className="mb-6">
          <CardHeader title="Create a key" />
          <CardBody>
            <ApiKeyForm action={createApiKeyAction} />
          </CardBody>
        </Card>
        {keys.length === 0 ? (
          <EmptyState
            title="No keys yet"
            description="Create one for the GIS Practice Hub sync script (hub/provision/sync_planner.py)."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH>Prefix</TH>
                <TH>Scopes</TH>
                <TH>Created</TH>
                <TH>Last used</TH>
                <TH>Status</TH>
                <TH className="w-28" />
              </tr>
            </THead>
            <TBody>
              {keys.map((k) => (
                <TR key={k.id}>
                  <TD className="font-medium">{k.name}</TD>
                  <TD>
                    <code className="text-xs">{k.prefix}...</code>
                  </TD>
                  <TD>{k.scopes.join(", ")}</TD>
                  <TD>{formatDateTime(k.createdAt)}</TD>
                  <TD>{k.lastUsedAt ? formatDateTime(k.lastUsedAt) : "never"}</TD>
                  <TD>{k.revokedAt ? `Revoked ${formatDateTime(k.revokedAt)}` : "Active"}</TD>
                  <TD>
                    {!k.revokedAt ? (
                      <ActionForm action={revokeApiKeyAction}>
                        <input type="hidden" name="id" value={k.id} />
                        <ConfirmSubmit
                          size="sm"
                          title={`Revoke "${k.name}"?`}
                          description="Systems using this key stop working immediately. This cannot be undone."
                          confirmLabel="Revoke key"
                        >
                          Revoke
                        </ConfirmSubmit>
                      </ActionForm>
                    ) : null}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </>
    );
  });
}
