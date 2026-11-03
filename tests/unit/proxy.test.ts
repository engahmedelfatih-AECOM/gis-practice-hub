import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

/**
 * The edge guard redirects anonymous browsers to the login page. The machine interfaces carry
 * their own credential and have no session cookie, so they must pass through: the feed under
 * /api/hub/v1 (x-api-key) and the job endpoints (report 2026-11-02, B4).
 */
const req = (path: string, cookie = false) =>
  new NextRequest(`https://hub.test${path}`, { headers: cookie ? { cookie: "gh.session_token=x" } : {} });

describe("request proxy", () => {
  const passesThrough = [
    "/login",
    "/api/auth/sign-in",
    "/api/health",
    "/api/hub/v1/projects",
    "/api/hub/v1/packages",
    "/api/hub/v1/schema",
    "/api/hub/v1/updates",
    "/api/jobs/anything",
    "/brand/wordmark.svg",
    "/favicon.ico",
  ];

  for (const path of passesThrough) {
    it(`lets ${path} through without a session cookie`, () => {
      const res = proxy(req(path));
      expect(res.status, path).not.toBe(307);
      expect(res.headers.get("location"), path).toBeNull();
    });
  }

  const guarded = ["/", "/projects", "/packages", "/schema", "/admin/import", "/api/export/register/projects"];

  for (const path of guarded) {
    it(`redirects ${path} to the login page without a session cookie`, () => {
      const res = proxy(req(path));
      expect(res.status, path).toBe(307);
      expect(res.headers.get("location"), path).toContain("/login");
    });

    it(`serves ${path} with a session cookie`, () => {
      const res = proxy(req(path, true));
      expect(res.headers.get("location"), path).toBeNull();
      expect(res.headers.get("Content-Security-Policy"), path).toContain("default-src 'self'");
    });
  }

  it("keeps the wanted path in the login redirect", () => {
    expect(proxy(req("/packages")).headers.get("location")).toContain(`next=${encodeURIComponent("/packages")}`);
  });

  it("sends a signed-in user away from the login page", () => {
    const res = proxy(req("/login", true));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toMatch(/https:\/\/hub\.test\/$/);
  });

  it("attaches the security headers and allows the map origins", () => {
    const res = proxy(req("/", true));
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    const csp = res.headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("https://tile.openstreetmap.org");
    expect(csp).toContain("worker-src 'self' blob:");
  });
});
