import { Badge, type BadgeTone } from "./badge";
import { humanise } from "@/lib/format";

const TONES: Record<string, BadgeTone> = {
  DRAFT: "neutral",
  PENDING_ROUTING: "warn",
  AWAITING_PROPOSAL: "warn",
  PENDING_APPROVAL: "warn",
  PROPOSED: "warn",
  AMENDMENT_PENDING: "warn",
  RETURNED: "info",
  RETURNED_TO_PM: "info",
  PARTIALLY_FULFILLED: "info",
  FULFILLED: "ok",
  APPROVED: "ok",
  COMPLETED: "neutral",
  ON_HOLD: "info",
  REJECTED: "danger",
  CANCELLED: "danger",
  WITHDRAWN: "neutral",
  SUPERSEDED: "neutral",
  PLANNED: "info",
  CONFIRMED: "ok",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={TONES[status] ?? "neutral"}>{humanise(status)}</Badge>;
}
