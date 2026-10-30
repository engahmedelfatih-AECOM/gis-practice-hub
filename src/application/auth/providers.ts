import "server-only";
import { entraConfigured } from "@/infrastructure/config/env";

/** Which sign-in methods this deployment offers (read by the login page). */
export function signInMethods(): { password: boolean; microsoft: boolean } {
  return { password: true, microsoft: entraConfigured };
}
