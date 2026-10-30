"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { authClient, startMicrosoftSignIn } from "./auth-client";

export function LoginForm({ next, microsoft = false }: { next: string; microsoft?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  async function signInWithMicrosoft() {
    setError(null);
    setPending(true);
    const url = await startMicrosoftSignIn(safeNext);
    if (!url) {
      setPending(false);
      setError("Microsoft sign-in could not start. Try again or use your password.");
      return;
    }
    window.location.assign(url);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const { error: err } = await authClient.signIn.email({ email, password });
    setPending(false);
    if (err) {
      setError(
        err.status === 429
          ? "Too many attempts. Please wait a minute and try again."
          : "Incorrect e-mail address or password, or the account is not active.",
      );
      return;
    }
    router.replace(safeNext);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {microsoft ? (
        <>
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={pending}
            onClick={signInWithMicrosoft}
          >
            Sign in with your AECOM Microsoft account
          </Button>
          <p className="text-center text-xs text-gray-500">or with a local password</p>
        </>
      ) : null}
      <div>
        <Label htmlFor="email" className="mb-1">
          Work e-mail
        </Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div>
        <Label htmlFor="password" className="mb-1">
          Password
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Sign in
      </Button>
      <p className="text-center text-xs text-gray-500">
        Accounts are provisioned by an Administrator. Contact them if you cannot sign in.
      </p>
    </form>
  );
}
