import type { Metadata } from "next";
import { requireActor } from "@/application/auth/actor";
import { listSettings } from "@/application/settings/settings";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime } from "@/lib/format";
import { guarded } from "@/app/_lib/page-guard";
import { SettingForm } from "./setting-form";
import { updateSettingAction } from "./actions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  return guarded(async () => {
    const actor = await requireActor();
    const settings = await listSettings(actor);
    return (
      <>
        <PageHeader
          title="Settings"
          description="Business-rule parameters. Every change is audited and takes effect immediately."
          crumbs={[{ label: "Administration" }, { label: "Settings" }]}
        />
        <div className="divide-border border-border bg-surface divide-y rounded-lg border">
          {settings.map((s) => (
            <div
              key={s.key}
              className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]"
            >
              <div>
                <p className="text-sm font-medium">{s.label}</p>
                <p className="mt-0.5 font-mono text-xs text-gray-500">{s.key}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {s.isDefault ? <Badge>Default</Badge> : `Updated ${formatDateTime(s.updatedAt)}`}
                </p>
              </div>
              <SettingForm action={updateSettingAction} keyName={s.key} value={s.value} />
            </div>
          ))}
        </div>
      </>
    );
  });
}
