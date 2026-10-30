import "server-only";
import { z } from "zod";

/**
 * Single, validated view of the process environment. Importing this module
 * anywhere on the server fails fast at boot when configuration is missing,
 * instead of failing on the first request that needs it.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters (use `openssl rand -base64 32`)"),
  LOG_LEVEL: z.enum(["silent", "fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  // Microsoft Entra ID sign-in (optional; the button appears when all three are set).
  MS_TENANT_ID: z.string().optional(),
  MS_CLIENT_ID: z.string().optional(),
  MS_CLIENT_SECRET: z.string().optional(),
  // Shared secret for scheduler-triggered jobs under /api/jobs.
  JOB_TOKEN: z.string().min(16).optional(),
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env: Env = load();
export const isProduction = env.NODE_ENV === "production";
export const entraConfigured = Boolean(
  env.MS_TENANT_ID && env.MS_CLIENT_ID && env.MS_CLIENT_SECRET,
);
