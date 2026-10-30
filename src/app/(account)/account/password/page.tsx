import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActor } from "@/application/auth/actor";
import { Wordmark } from "@/components/brand/wordmark";
import { Alert } from "@/components/ui/alert";
import { param, type SearchParams } from "@/app/_lib/actions";
import { PasswordForm } from "./password-form";
import { changePasswordAction } from "./actions";

export const metadata: Metadata = { title: "Change password" };

export default async function PasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  const required = param(await searchParams, "required") === "1" || actor.mustChangePassword;
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="bg-brand-primary flex h-14 items-center px-6">
        <Wordmark tone="light" />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <div className="border-border bg-surface w-full max-w-md rounded-lg border p-8 shadow-sm">
          <h1 className="text-xl font-semibold">Change password</h1>
          <p className="mt-1 mb-5 text-sm text-gray-600">
            Signed in as <strong>{actor.email}</strong>.
          </p>
          {required ? (
            <Alert tone="warn" className="mb-5">
              Your password was set by an Administrator. Choose a new one before continuing.
            </Alert>
          ) : null}
          <PasswordForm action={changePasswordAction} />
          {!required ? (
            <p className="mt-4 text-sm">
              <Link href="/" className="text-brand-link hover:underline">
                Back to home
              </Link>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
