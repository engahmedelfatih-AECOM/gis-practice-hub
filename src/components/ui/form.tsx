"use client";

import {
  createContext,
  useActionState,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import { Alert } from "./alert";
import { Button } from "./button";
import { idleState, type ActionState } from "./action-state";
import { cn } from "@/lib/cn";

type ServerAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const FormCtx = createContext<{ state: ActionState; pending: boolean }>({
  state: idleState,
  pending: false,
});

/**
 * Form bound to a server action with progressive enhancement: it submits
 * without JavaScript and shows field-level errors returned by the action.
 */
export function ActionForm({
  action,
  children,
  className,
  ...props
}: Omit<ComponentProps<"form">, "action"> & { action: ServerAction; children: ReactNode }) {
  const [state, formAction, pending] = useActionState(action, idleState);
  return (
    <FormCtx value={{ state, pending }}>
      <form action={formAction} className={cn("space-y-5", className)} noValidate {...props}>
        {children}
      </form>
    </FormCtx>
  );
}

export function useFormStatusState() {
  return useContext(FormCtx);
}

export function FormMessage() {
  const { state } = useFormStatusState();
  if (state.status === "error") return <Alert tone="danger">{state.message}</Alert>;
  if (state.status === "success" && state.message) return <Alert tone="ok">{state.message}</Alert>;
  return null;
}

export function FieldError({ name }: { name: string }) {
  const { state } = useFormStatusState();
  const errors = state.status === "error" ? state.fieldErrors?.[name] : undefined;
  if (!errors?.length) return null;
  return (
    <p id={`${name}-error`} className="text-status-danger mt-1 text-xs">
      {errors.join(" ")}
    </p>
  );
}

export function useFieldInvalid(name: string): boolean {
  const { state } = useFormStatusState();
  return state.status === "error" && Boolean(state.fieldErrors?.[name]?.length);
}

export function SubmitButton({
  children,
  pendingText,
  ...props
}: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatusState();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
