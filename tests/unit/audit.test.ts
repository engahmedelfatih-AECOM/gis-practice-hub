import { describe, expect, it } from "vitest";
import { normaliseIp, redact } from "@/application/audit/audit";

describe("normaliseIp", () => {
  it("drops empty and invalid values instead of failing the inet column", () => {
    expect(normaliseIp("")).toBeNull();
    expect(normaliseIp(null)).toBeNull();
    expect(normaliseIp(undefined)).toBeNull();
    expect(normaliseIp("unknown")).toBeNull();
  });
  it("keeps valid addresses and takes the first of a forwarded chain", () => {
    expect(normaliseIp("10.1.2.3")).toBe("10.1.2.3");
    expect(normaliseIp(" 10.1.2.3 , 192.168.0.1")).toBe("10.1.2.3");
    expect(normaliseIp("2001:db8::1")).toBe("2001:db8::1");
  });
});

describe("redact", () => {
  it("masks secret fields in nested snapshots", () => {
    expect(redact({ a: { password: "x", name: "n" } })).toEqual({
      a: { password: "[redacted]", name: "n" },
    });
  });
});
