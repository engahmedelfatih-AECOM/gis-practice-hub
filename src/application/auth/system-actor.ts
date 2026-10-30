import type { Actor } from "./actor";

/** Synthetic principal for trusted server-side jobs (feeds, scheduled tasks). */
export function systemActor(name: string): Actor {
  return {
    userId: "00000000-0000-0000-0000-000000000000",
    roles: [{ role: "ADMINISTRATOR", scopeType: "GLOBAL", scopeId: null }],
    email: `${name}@system.local`,
    name: `System (${name})`,
    sessionId: "",
    mustChangePassword: false,
    ipAddress: null,
  };
}
