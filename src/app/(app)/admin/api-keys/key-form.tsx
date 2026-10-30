"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { idleState, type ActionState } from "@/components/ui/action-state";

export function ApiKeyForm({
  action,
}: {
  action: (p: ActionState, fd: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const message = state.status === "idle" ? null : state.message;
  const keyStart = message?.indexOf("rpk_") ?? -1;
  return (
    <form action={formAction} className="space-y-3">
      {state.status === "error" ? <Alert tone="danger">{state.message}</Alert> : null}
      {state.status === "success" && message && keyStart >= 0 ? (
        <Alert tone="warn">
          <p className="font-medium">{message.slice(0, keyStart).replace(/:\s*$/, "")}</p>
          <code className="mt-2 block rounded bg-white px-2 py-1 text-xs break-all">
            {message.slice(keyStart)}
          </code>
        </Alert>
      ) : state.status === "success" && message ? (
        <Alert tone="ok">{message}</Alert>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64">
          <Label htmlFor="name" className="mb-1">
            Key name (who uses it)
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="GIS Practice Hub sync"
            required
            maxLength={80}
          />
        </div>
        <Button type="submit" disabled={pending}>
          Create key
        </Button>
      </div>
    </form>
  );
}
