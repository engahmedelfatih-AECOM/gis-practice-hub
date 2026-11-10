/**
 * Cell colours of the workbook, mapped to the AECOM tokens: the same value gets the same colour
 * on every screen and in the exports (Earth Green approved, lime delivered, yellow in progress,
 * coral comments or red, dark not started, grey on hold or not applicable).
 */
export type Tone = "green" | "lime" | "amber" | "coral" | "dark" | "grey" | "teal" | "none";

export const TONE_CLASS: Record<Tone, string> = {
  green: "bg-earth-green text-white",
  lime: "bg-lime-green-50 text-gray-900",
  amber: "bg-sunrise-yellow text-gray-900",
  // Dark text: white on this fill is 3.2:1, below WCAG AA. The fill is the workbook colour and stays.
  coral: "bg-coral-orange-75 text-gray-900",
  dark: "bg-midnight-teal text-white",
  grey: "bg-black-25 text-gray-700",
  teal: "bg-ocean-teal-25 text-gray-900",
  none: "",
};

const STATUS_TONES: Record<string, Tone> = {
  // package status
  Approved: "green",
  Submitted: "lime",
  Resubmitted: "lime",
  Delivered: "lime",
  "In Progress": "amber",
  "Internal QA/QC": "amber",
  "Client Comments": "coral",
  "Not Started": "dark",
  "On Hold": "grey",
  Cancelled: "grey",
  "N/A": "grey",
  // project status
  Progressing: "green",
  "At Risk": "amber",
  Completed: "dark",
  // RAG and checks
  Green: "lime",
  Amber: "amber",
  Red: "coral",
  Pass: "lime",
  Fail: "coral",
  Pending: "grey",
  // availability
  Available: "lime",
  Unavailable: "grey",
  Partial: "amber",
  "Partially Available": "amber",
  "Fully Booked": "coral",
  // client review
  "Pending Submission": "grey",
  "Under Review": "teal",
  "Comments Issued": "coral",
  "Re-Submission Required": "coral",
  "Approved in Principle": "lime",
  // RFI, risk
  Open: "amber",
  Answered: "teal",
  Closed: "lime",
  Monitoring: "teal",
};

export function toneOf(value: string | null | undefined): Tone {
  if (!value) return "none";
  return STATUS_TONES[value] ?? "none";
}

export function toneClass(value: string | null | undefined): string {
  return TONE_CLASS[toneOf(value)];
}
