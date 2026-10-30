import type { Metadata } from "next";
import { Wordmark } from "@/components/brand/wordmark";
import { LoginForm } from "@/components/auth/login-form";
import { param, type SearchParams } from "@/app/_lib/actions";
import { signInMethods } from "@/application/auth/providers";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = param(sp, "next") ?? "/";
  const ssoError = param(sp, "error") === "sso";
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="bg-brand-primary flex h-14 items-center px-6">
        <Wordmark tone="light" />
        <span
          className="from-lime-green via-sunrise-yellow to-ocean-teal ml-auto h-2 w-24 rounded-full bg-gradient-to-r"
          aria-hidden
        />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="border-border bg-surface w-full max-w-sm rounded-lg border p-8 shadow-sm">
          <h1 className="text-xl font-semibold">GIS Hub</h1>
          <p className="mt-1 mb-6 text-sm text-gray-600">Sign in with your work account.</p>
          {ssoError ? (
            <p className="text-status-danger mb-4 text-sm" role="alert">
              Microsoft sign-in did not complete. Your account must exist here with the same e-mail
              address; ask an Administrator.
            </p>
          ) : null}
          <LoginForm next={next} microsoft={signInMethods().microsoft} />
        </div>
      </main>
      <footer className="px-6 py-4 text-center text-xs text-gray-500">
        Internal system. Authorised users only. Activity is logged.
      </footer>
    </div>
  );
}
