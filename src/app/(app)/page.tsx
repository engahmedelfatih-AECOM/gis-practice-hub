import { requireActor } from "@/application/auth/actor";
import { getOverview } from "@/application/system/overview";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { guarded } from "@/app/_lib/page-guard";
import Link from "next/link";

export default async function HomePage() {
  return guarded(async () => {
    const actor = await requireActor();
    const overview = await getOverview(actor);
    return (
      <>
        <PageHeader title={`Welcome, ${actor.name}`} description="GIS Practice Hub dashboard." />
        {overview.setup.length ? (
          <Card>
            <CardHeader title="Setup" description="Steps to complete before the team starts." />
            <CardBody>
              <ul className="space-y-1 text-sm">
                {overview.setup.map((s) => (
                  <li key={s.label}>
                    <Link href={s.href} className="text-brand-link hover:underline">
                      {s.done ? "Done - " : "To do - "}
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}
      </>
    );
  });
}
