import type { Metadata } from "next";
import Link from "next/link";
import { requireActor } from "@/application/auth/actor";
import { listUsers } from "@/application/identity/users";
import { ActiveBadge, Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { SearchForm } from "@/components/ui/search-form";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { guarded } from "@/app/_lib/page-guard";
import { param, type SearchParams } from "@/app/_lib/actions";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return guarded(async () => {
    const actor = await requireActor();
    const q = param(sp, "q");
    const includeInactive = param(sp, "inactive") === "1";
    const page = await listUsers(actor, {
      q,
      includeInactive,
      page: param(sp, "page") ?? undefined,
    });
    const makeHref = (p: number) =>
      `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(includeInactive ? { inactive: "1" } : {}), page: String(p) })}`;
    return (
      <>
        <PageHeader
          title="Users & roles"
          description="Accounts are provisioned here; there is no self sign-up. Roles are granted per user with a scope."
          crumbs={[{ label: "Administration" }, { label: "Users & roles" }]}
          actions={<ButtonLink href="/admin/users/new">New user</ButtonLink>}
        />
        <SearchForm q={q} includeInactive={includeInactive} placeholder="Name or e-mail" />
        {page.items.length === 0 ? (
          <EmptyState title="No users" description="No accounts match these filters." />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <TH>Name</TH>
                  <TH>E-mail</TH>
                  <TH>Roles</TH>
                  <TH>Sign-in</TH>
                  <TH>Last sign-in</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {page.items.map((u) => (
                  <TR key={u.id}>
                    <TD>
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-brand-link font-medium hover:underline"
                      >
                        {u.name}
                      </Link>
                    </TD>
                    <TD className="text-gray-700">{u.email}</TD>
                    <TD>
                      {u.roleCount === 0 ? (
                        <Badge tone="warn">No roles</Badge>
                      ) : (
                        <Badge tone="info">
                          {u.roleCount} role{u.roleCount === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </TD>
                    <TD className="text-xs text-gray-600">
                      {u.authProvider}
                      {u.mustChangePassword ? (
                        <Badge tone="warn" className="ml-2">
                          Must change password
                        </Badge>
                      ) : null}
                    </TD>
                    <TD className="text-gray-600">{formatDateTime(u.lastLoginAt)}</TD>
                    <TD>
                      <ActiveBadge active={u.isActive} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination
              page={page.page}
              pageSize={page.pageSize}
              total={page.total}
              makeHref={makeHref}
            />
          </>
        )}
      </>
    );
  });
}
