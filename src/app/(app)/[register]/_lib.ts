import { notFound } from "next/navigation";
import { REGISTERS, type RegisterDef, type RegisterKey } from "@/domain/hub/registers";

const BY_PATH = new Map(Object.values(REGISTERS).map((d) => [d.path.slice(1), d]));

/** Resolve the URL segment (projects, packages, rfis ...) to its register, or 404. */
export function registerFromSegment(segment: string): RegisterDef {
  const def = BY_PATH.get(segment);
  if (!def) notFound();
  return def;
}

export function isRegisterKey(k: string): k is RegisterKey {
  return k in REGISTERS;
}
