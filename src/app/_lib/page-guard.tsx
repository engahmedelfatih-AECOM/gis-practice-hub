import "server-only";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { isAppError } from "@/application/errors";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";

/**
 * Render a page body, mapping application errors to the right UI:
 * 403 → access-denied panel, 404 → Next not-found, 401 → login.
 */
export async function guarded(render: () => Promise<ReactNode>): Promise<ReactNode> {
  try {
    return await render();
  } catch (err) {
    if (isAppError(err)) {
      if (err.code === "NOT_FOUND") notFound();
      if (err.code === "UNAUTHENTICATED") redirect("/login");
      if (err.code === "FORBIDDEN") return <AccessDenied message={err.message} />;
    }
    throw err;
  }
}

export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <Alert tone="warn">
        <p className="font-semibold">Access denied</p>
        <p className="mt-1">{message ?? "You do not have permission to view this page."}</p>
      </Alert>
      <div className="mt-4">
        <ButtonLink href="/" variant="secondary">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}
