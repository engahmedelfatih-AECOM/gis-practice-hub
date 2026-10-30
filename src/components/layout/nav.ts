import type { Action } from "@/domain/authz/permissions";

export interface NavItem {
  href: string;
  label: string;
  /** Shown only when the user may perform this action. */
  action: Action;
  icon:
    | "home"
    | "folder"
    | "users"
    | "layers"
    | "calendar"
    | "settings"
    | "shield"
    | "list"
    | "grid"
    | "check"
    | "key"
    | "upload"
    | "clipboard"
    | "chart"
    | "globe"
    | "tags"
    | "alert"
    | "help"
    | "book"
    | "lightbulb"
    | "database"
    | "table";
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

/** One entry per sheet of the GIS Practice Hub workbook, in the same order as the Home sheet. */
export const NAV: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/", label: "Dashboard", action: "hub:read", icon: "home" }],
  },
  {
    label: "Registers",
    items: [
      { href: "/projects", label: "Projects", action: "hub:read", icon: "folder" },
      { href: "/packages", label: "Packages", action: "hub:read", icon: "grid" },
      { href: "/delivery-tracker", label: "Delivery Tracker", action: "hub:read", icon: "table" },
      { href: "/schema-tracker", label: "Schema Tracker", action: "hub:read", icon: "layers" },
      { href: "/resources", label: "Resources", action: "hub:read", icon: "users" },
      { href: "/updates", label: "Updates", action: "hub:read", icon: "clipboard" },
      { href: "/risks", label: "Risks", action: "hub:read", icon: "alert" },
      { href: "/rfis", label: "RFI Log", action: "hub:read", icon: "help" },
      { href: "/qaqc", label: "QAQC", action: "hub:read", icon: "check" },
      { href: "/standards", label: "Standards", action: "hub:read", icon: "book" },
      { href: "/innovation", label: "Innovation", action: "hub:read", icon: "lightbulb" },
    ],
  },
  {
    label: "Client schemas",
    items: [{ href: "/client-schemas", label: "Master Trackers", action: "hub:read", icon: "database" }],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/lists", label: "Lists", action: "list:manage", icon: "tags" },
      { href: "/admin/periods", label: "Report periods", action: "period:manage", icon: "calendar" },
      { href: "/admin/users", label: "Users & roles", action: "user:manage", icon: "shield" },
      { href: "/admin/settings", label: "Settings", action: "setting:manage", icon: "settings" },
      { href: "/admin/api-keys", label: "API keys", action: "apiKey:manage", icon: "key" },
      { href: "/admin/import", label: "Import workbooks", action: "import:run", icon: "upload" },
      { href: "/admin/audit", label: "Audit log", action: "audit:read", icon: "list" },
    ],
  },
];
