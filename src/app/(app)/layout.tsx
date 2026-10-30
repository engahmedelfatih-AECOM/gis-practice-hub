import { redirect } from "next/navigation";
import { getActor } from "@/application/auth/actor";
import { getSetting } from "@/application/settings/settings";
import { can } from "@/domain/authz/policy";
import { ROLE_LABELS } from "@/domain/shared/enums";
import { NAV } from "@/components/layout/nav";
import { Shell } from "@/components/layout/shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.mustChangePassword) redirect("/account/password?required=1");

  const nav = NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(actor, i.action)) })).filter(
    (g) => g.items.length > 0,
  );
  const roleLabels = Array.from(new Set(actor.roles.map((r) => ROLE_LABELS[r.role])));
  const plannerUrl = await getSetting("planner.url");

  return (
    <Shell
      nav={nav}
      user={{ name: actor.name, email: actor.email, roleLabels }}
      plannerUrl={plannerUrl || null}
    >
      {children}
    </Shell>
  );
}
