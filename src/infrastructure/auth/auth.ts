import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth, microsoftEntraId } from "better-auth/plugins/generic-oauth";
import { eq } from "drizzle-orm";
import { entraConfigured, env, isProduction } from "@/infrastructure/config/env";
import { db } from "@/infrastructure/db/client";
import {
  appUser,
  authAccount,
  authRateLimit,
  authSession,
  authVerification,
} from "@/infrastructure/db/schema";
import { logger } from "@/lib/logger";

/** Sliding session lifetime: a session ends after this long without activity. */
export const SESSION_IDLE_SECONDS = 8 * 60 * 60;
/** How often an active session's expiry is pushed forward. */
export const SESSION_REFRESH_SECONDS = 15 * 60;

/**
 * Authentication provider. Phase 1 = local e-mail + password accounts that an
 * Administrator provisions (self sign-up is disabled). Microsoft Entra ID or
 * Portal for ArcGIS can be added later as an OIDC provider without changing
 * the rest of the application: roles live in `role_assignment`, not here.
 */
export const auth = betterAuth({
  appName: "GIS Hub",
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
  database: drizzleAdapter(db, {
    provider: "pg",
    transaction: true,
    schema: {
      user: appUser,
      app_user: appUser,
      session: authSession,
      auth_session: authSession,
      account: authAccount,
      auth_account: authAccount,
      verification: authVerification,
      auth_verification: authVerification,
      rateLimit: authRateLimit,
      auth_rate_limit: authRateLimit,
    },
  }),
  user: {
    modelName: "app_user",
    additionalFields: {
      isActive: { type: "boolean", required: false, defaultValue: true, input: false },
      mustChangePassword: { type: "boolean", required: false, defaultValue: false, input: false },
      authProvider: { type: "string", required: false, defaultValue: "LOCAL", input: false },
      lastLoginAt: { type: "date", required: false, input: false },
    },
  },
  session: {
    modelName: "auth_session",
    expiresIn: SESSION_IDLE_SECONDS,
    updateAge: SESSION_REFRESH_SECONDS,
    // Always read the session from the database so revocation is immediate.
    cookieCache: { enabled: false },
  },
  account: {
    modelName: "auth_account",
    // A Microsoft sign-in attaches to the existing local account with the same work e-mail.
    accountLinking: {
      enabled: true,
      trustedProviders: ["microsoft-entra-id"],
      allowDifferentEmails: false,
    },
  },
  verification: { modelName: "auth_verification" },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "auth_rate_limit",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/change-password": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 3 },
    },
  },
  advanced: {
    cookiePrefix: "gh",
    useSecureCookies: isProduction,
    database: { generateId: "uuid" },
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
  },
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          if (account.providerId !== "microsoft-entra-id") return;
          await db
            .update(appUser)
            .set({ authProvider: "ENTRA" })
            .where(eq(appUser.id, account.userId));
        },
      },
    },
    session: {
      create: {
        // Deactivated users cannot start a new session even with valid credentials.
        before: async (session) => {
          const [user] = await db
            .select({ isActive: appUser.isActive })
            .from(appUser)
            .where(eq(appUser.id, session.userId))
            .limit(1);
          if (!user?.isActive) {
            logger.warn({ userId: session.userId }, "sign-in refused: user is deactivated");
            return false;
          }
          await db
            .update(appUser)
            .set({ lastLoginAt: new Date() })
            .where(eq(appUser.id, session.userId));
          return undefined;
        },
      },
    },
  },
  plugins: [
    nextCookies(),
    // Microsoft Entra ID single sign-on. Accounts are still provisioned here first: a Microsoft
    // identity whose e-mail has no local account is refused (no implicit sign-up). MFA and
    // conditional access are enforced by the tenant.
    ...(entraConfigured
      ? [
          genericOAuth({
            config: [
              {
                ...microsoftEntraId({
                  clientId: env.MS_CLIENT_ID!,
                  clientSecret: env.MS_CLIENT_SECRET!,
                  tenantId: env.MS_TENANT_ID!,
                }),
                disableImplicitSignUp: true,
                disableSignUp: true,
              },
            ],
          }),
        ]
      : []),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
