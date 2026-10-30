"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/input";
import { idleState, type ActionState } from "@/components/ui/action-state";

export function ImportForm({ action, kind }: { action: (p: ActionState, fd: FormData) => Promise<ActionState>; kind: "hub" | "client" }) {
  const [state, formAction, pending] = useActionState(action, idleState);
  return (
    <form action={formAction} className="space-y-3" encType="multipart/form-data">
      {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}
      {state.status === "success" && state.message ? (
        <Alert tone="ok">
          <pre className="font-sans text-xs whitespace-pre-wrap">{state.message}</pre>
        </Alert>
      ) : null}
      {kind === "client" ? (
        <div>
          <Label htmlFor={`${kind}-client`} className="mb-1">
            Client name
          </Label>
          <Input id={`${kind}-client`} name="clientName" placeholder="QIC" required className="w-64" />
        </div>
      ) : null}
      <div>
        <Label htmlFor={`${kind}-file`} className="mb-1">
          Workbook (.xlsx)
        </Label>
        <Input id={`${kind}-file`} name="file" type="file" accept=".xlsx" required className="h-auto py-2" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="dryRun" defaultChecked /> Dry run (show the counts, change nothing)
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Importing..." : "Import"}
      </Button>
    </form>
  );
}
