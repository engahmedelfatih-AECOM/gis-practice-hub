import type { Metadata } from "next";
import { requireActor } from "@/application/auth/actor";
import { currentPeriodSetting, listPeriods, periodUsage } from "@/application/hub/periods";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { DeleteControl } from "@/components/ui/delete-control";
import { Badge } from "@/components/ui/badge";
import { ActionForm, FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Label } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { guarded } from "@/app/_lib/page-guard";
import { addPeriodAction, deletePeriodAction, regeneratePeriodsAction, setCurrentPeriodAction, updatePeriodAction } from "./actions";

export const metadata: Metadata = { title: "Report periods" };

/** The bi-weekly calendar (Lists sheet columns R to T): first start date, every period follows on. */
export default async function PeriodsPage() {
  return guarded(async () => {
    const actor = await requireActor();
    const [periods, current] = await Promise.all([listPeriods(), currentPeriodSetting()]);
    const usage = await periodUsage(actor, periods);
    return (
      <>
        <PageHeader
          title="Report periods"
          description="The bi-weekly calendar behind the Dashboard selector and the update pages. An update row is placed on the period that contains its Period From date."
          crumbs={[{ label: "Administration" }, { label: "Report periods" }]}
        />
        <Card className="mb-4">
          <CardHeader
            title="Current report period"
            description="The period everyone opens on the Dashboard and the project updates. A user can still look at another period."
          />
          <CardBody>
            <ActionForm action={setCurrentPeriodAction} className="flex flex-wrap items-center gap-3 text-sm">
              <input type="hidden" name="id" value="" />
              <p>
                {current ? (
                  <>
                    Set to <span className="font-semibold">{current.label}</span>.
                  </>
                ) : (
                  "Not set: the Hub shows the period that contains today's date."
                )}
              </p>
              {current ? (
                <SubmitButton size="sm" variant="secondary">
                  Follow today&apos;s date
                </SubmitButton>
              ) : null}
              <FormMessage />
            </ActionForm>
          </CardBody>
        </Card>
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Regenerate the calendar" description="Replaces every period: N periods of the configured length from the first start date." />
            <CardBody>
              <ActionForm action={regeneratePeriodsAction} className="flex flex-wrap items-end gap-3">
                <div>
                  <Label htmlFor="startDate" className="mb-1">
                    First period start
                  </Label>
                  <Input id="startDate" name="startDate" type="date" required defaultValue={periods[0]?.startDate ?? ""} />
                </div>
                <div>
                  <Label htmlFor="count" className="mb-1">
                    Periods
                  </Label>
                  <Input id="count" name="count" type="number" min={1} max={200} defaultValue={periods.length || 80} className="w-24" />
                </div>
                <ConfirmSubmit variant="primary" title="Regenerate the calendar?" description="Every existing period is replaced. Update rows keep their own dates and are re-bucketed automatically." confirmLabel="Regenerate">
                  Regenerate
                </ConfirmSubmit>
                <FormMessage />
              </ActionForm>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Add one period" description="End date defaults to start plus the configured length minus one day." />
            <CardBody>
              <ActionForm action={addPeriodAction} className="flex flex-wrap items-end gap-3">
                <div>
                  <Label htmlFor="newStart" className="mb-1">
                    Start
                  </Label>
                  <Input id="newStart" name="startDate" type="date" required />
                </div>
                <div>
                  <Label htmlFor="newEnd" className="mb-1">
                    End (optional)
                  </Label>
                  <Input id="newEnd" name="endDate" type="date" />
                </div>
                <SubmitButton>Add</SubmitButton>
                <FormMessage />
              </ActionForm>
            </CardBody>
          </Card>
        </div>
        <Table>
          <THead>
            <tr>
              <TH>#</TH>
              <TH>Report period</TH>
              <TH>Start</TH>
              <TH>End</TH>
              <TH className="w-80" />
            </tr>
          </THead>
          <TBody>
            {periods.map((p, i) => (
              <TR key={p.id}>
                <TD className="text-gray-500">{i + 1}</TD>
                <TD className="font-medium">
                  {p.label}
                  {current?.id === p.id ? (
                    <Badge tone="brand" className="ml-2">
                      Current
                    </Badge>
                  ) : null}
                </TD>
                <TD colSpan={2}>
                  <ActionForm action={updatePeriodAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <Input name="startDate" type="date" defaultValue={p.startDate} className="h-8 w-40 text-xs" aria-label="Start" />
                    <Input name="endDate" type="date" defaultValue={p.endDate} className="h-8 w-40 text-xs" aria-label="End" />
                    <SubmitButton size="sm" variant="secondary">
                      Save
                    </SubmitButton>
                    <FormMessage />
                  </ActionForm>
                </TD>
                <TD className="text-right">
                  {current?.id === p.id ? null : (
                    <ActionForm action={setCurrentPeriodAction} className="mr-2 inline">
                      <input type="hidden" name="id" value={p.id} />
                      <SubmitButton size="sm" variant="ghost" aria-label={`Set ${p.label} as the current report period`}>
                        Set as current
                      </SubmitButton>
                    </ActionForm>
                  )}
                  <ActionForm action={deletePeriodAction} className="inline-block space-y-1 align-middle">
                    <input type="hidden" name="id" value={p.id} />
                    <DeleteControl mode="icon" name={`the period ${p.label}`} usedBy={usage.get(p.id)?.note ?? null} description="It will be removed from the calendar." />
                    <FormMessage />
                  </ActionForm>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </>
    );
  });
}
