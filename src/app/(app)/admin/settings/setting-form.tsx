"use client";

import { Input } from "@/components/ui/input";
import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/components/ui/form";
import type { ActionState } from "@/components/ui/action-state";

export function SettingForm({
  action,
  keyName,
  value,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  keyName: string;
  value: unknown;
}) {
  return (
    <ActionForm action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="key" value={keyName} />
      <Control keyName={keyName} value={value} />
      <SubmitButton size="sm" variant="secondary" pendingText="Saving…">
        Save
      </SubmitButton>
      <div className="basis-full">
        <FieldError name="value" />
        <FormMessage />
      </div>
    </ActionForm>
  );
}

function Control({ keyName, value }: { keyName: string; value: unknown }) {
  switch (keyName) {
    case "map.center": {
      const v = value as { lat: number; lng: number; zoom: number };
      return (
        <div className="flex items-center gap-2 text-sm">
          <span>Lat</span>
          <Input name="lat" type="number" step="0.0001" defaultValue={v.lat} className="w-28" />
          <span>Lng</span>
          <Input name="lng" type="number" step="0.0001" defaultValue={v.lng} className="w-28" />
          <span>Zoom</span>
          <Input name="zoom" type="number" step="0.1" min={1} max={18} defaultValue={v.zoom} className="w-20" />
        </div>
      );
    }
    case "report.itemsPerBlock":
    case "report.periodDays":
      return <Input name="value" type="number" min={1} defaultValue={String(value)} className="w-32" />;
    default:
      return <Input name="value" defaultValue={String(value)} className="w-72" />;
  }
}
