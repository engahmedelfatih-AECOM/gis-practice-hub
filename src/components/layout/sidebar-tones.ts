/**
 * Colour classes of the floating navigation panel. Kept in one place so the contrast gate
 * (tests/unit/contrast.test.ts) checks exactly what the sidebar renders: the panel is a
 * semi-transparent glass of the deep brand green over the page surface, and every text on it
 * must still meet WCAG AA (4.5:1) once the transparency is blended in.
 */
export const SIDEBAR_TONES = {
  /** Glass panel: deep brand green at 90 % over the page surface. */
  panel: "bg-brand-green-deep/90",
  /** Row under the pointer: a light Midnight Teal wash over the panel. */
  hover: "hover:bg-midnight-teal/40",
  /** Active page: the darker pill behind the row. */
  active: "bg-midnight-teal/85",
  /** Role names under the user name. */
  role: "text-lime-green-25",
} as const;

/** Opacity (0 to 1) of the glass panel, used by the contrast gate. */
export const SIDEBAR_PANEL_ALPHA = 0.9;
