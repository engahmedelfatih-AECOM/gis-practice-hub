import { format, parseISO } from "date-fns";

/** `2026-11-02` → `02 Nov 2026` (one format everywhere, per plan §12). */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "-";
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return Number.isNaN(d.getTime()) ? "-" : format(d, "dd MMM yyyy");
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "-" : format(date, "dd MMM yyyy HH:mm");
}

/** Hours to one decimal place. */
export function formatHours(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "-";
  const v = typeof n === "string" ? Number(n) : n;
  return Number.isFinite(v) ? `${v.toFixed(1)} h` : "-";
}

/** Percentages to zero decimals. */
export function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "-";
  return `${Math.round(n)} %`;
}

export function formatMoney(
  amount: number | string | null | undefined,
  currency: string | null | undefined,
): string {
  if (amount === null || amount === undefined || amount === "" || !currency) return "-";
  const v = typeof amount === "string" ? Number(amount) : amount;
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(v);
  } catch {
    return `${v.toFixed(2)} ${currency}`;
  }
}

/** `SOME_ENUM_VALUE` → `Some enum value`. */
export function humanise(value: string | null | undefined): string {
  if (!value) return "-";
  const s = value.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
