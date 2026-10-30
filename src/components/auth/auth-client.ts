import { createAuthClient } from "better-auth/react";

/** Browser-side client for the authentication endpoints (sign-in / sign-out). */
export const authClient = createAuthClient();

/**
 * Start a Microsoft Entra ID sign-in (generic OAuth plugin). The server answers with the
 * authorisation URL; the browser follows it and returns to `callbackURL` when done.
 */
export async function startMicrosoftSignIn(callbackURL: string): Promise<string | null> {
  const { data, error } = await authClient.$fetch<{ url?: string; redirect?: boolean }>(
    "/sign-in/oauth2",
    {
      method: "POST",
      body: { providerId: "microsoft-entra-id", callbackURL, errorCallbackURL: "/login?error=sso" },
    },
  );
  if (error || !data?.url) return null;
  return data.url;
}
