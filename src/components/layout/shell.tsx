"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Tooltip } from "radix-ui";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Calendar,
  CheckSquare,
  CircleHelp,
  ClipboardCheck,
  Database,
  ExternalLink,
  Folder,
  Grid3x3,
  Home,
  KeyRound,
  Layers,
  Lightbulb,
  ListOrdered,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  Table2,
  Upload,
  Users,
  X,
  Globe,
  Tags,
} from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/cn";
import type { NavGroup, NavItem } from "./nav";
import { SIDEBAR_TONES } from "./sidebar-tones";
import { navArrowKeys, useDockMagnify, useSidebarCollapsed } from "./use-sidebar";

const ICONS: Record<NavItem["icon"], React.ComponentType<{ className?: string }>> = {
  home: Home,
  folder: Folder,
  users: Users,
  layers: Layers,
  calendar: Calendar,
  settings: Settings,
  shield: Shield,
  list: ListOrdered,
  grid: Grid3x3,
  check: CheckSquare,
  key: KeyRound,
  upload: Upload,
  clipboard: ClipboardCheck,
  chart: BarChart3,
  globe: Globe,
  tags: Tags,
  alert: AlertTriangle,
  help: CircleHelp,
  book: BookOpen,
  lightbulb: Lightbulb,
  database: Database,
  table: Table2,
};

export interface ShellUser {
  name: string;
  email: string;
  roleLabels: string[];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase() ||
    "?"
  );
}

/** Page name next to an icon-only control of the collapsed rail; plain content when expanded. */
function RailTip({ show, label, children }: { show: boolean; label: string; children: ReactNode }) {
  if (!show) return <>{children}</>;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={12}
          className="bg-midnight-teal z-50 rounded-md px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
        >
          {label}
          <Tooltip.Arrow className="fill-midnight-teal" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * The navigation panel: a floating rounded glass panel in the brand green. Expanded it shows
 * icons and labels; collapsed it is an icon rail with tooltips and thin dividers in place of the
 * group labels. Icons magnify like a dock as the mouse moves over the menu.
 */
function SidebarPanel({
  nav,
  user,
  collapsed,
  onToggle,
  onNavigate,
}: {
  nav: NavGroup[];
  user: ShellUser;
  collapsed: boolean;
  /** Collapse button at the top; left out in the mobile drawer. */
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const listRef = useRef<HTMLDivElement>(null);
  useDockMagnify(listRef, !collapsed);

  const rowBase = cn(
    "relative flex items-center rounded-lg text-sm text-white transition-colors",
    collapsed ? "h-10 justify-center" : "gap-3 px-3 py-1.5",
  );
  const iconBox = cn(
    "flex shrink-0 items-center justify-center will-change-transform transition-transform duration-150 ease-out motion-reduce:transition-none",
    collapsed ? "h-5 w-5 origin-center" : "h-4 w-4 origin-left",
  );

  return (
    <div
      data-nav-panel
      className={cn(
        SIDEBAR_TONES.panel,
        "shadow-midnight-teal/25 flex h-full flex-col overflow-hidden rounded-2xl border border-white/20 text-white shadow-lg backdrop-blur-md",
      )}
    >
      {onToggle ? (
        <div
          className={cn(
            "flex items-center border-b border-white/15 p-2",
            collapsed ? "justify-center" : "justify-end",
          )}
        >
          <RailTip show={collapsed} label="Expand navigation">
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              aria-expanded={!collapsed}
              aria-controls="hub-sidebar"
              className={cn(SIDEBAR_TONES.hover, "rounded-lg p-2 text-white")}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-5 w-5" aria-hidden />
              ) : (
                <PanelLeftClose className="h-5 w-5" aria-hidden />
              )}
            </button>
          </RailTip>
        </div>
      ) : null}

      <nav aria-label="Main" className="min-h-0 flex-1">
        <div
          ref={listRef}
          onKeyDown={navArrowKeys}
          className={cn(
            "flex h-full flex-col overflow-x-hidden overflow-y-auto py-3",
            collapsed ? "gap-1 px-2" : "gap-3 px-3",
          )}
        >
          {nav.map((group, gi) => (
            <div key={group.label ?? "root"}>
              {group.label && collapsed && gi > 0 ? (
                <hr className="mx-2 mb-1 border-white/25" />
              ) : null}
              {group.label && !collapsed ? (
                <p className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-white uppercase">
                  {group.label}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon];
                  // Section homes ("/") highlight only on exact match; other items on prefix.
                  const active =
                    item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <RailTip show={collapsed} label={item.label}>
                        <Link
                          href={item.href}
                          data-dock-row
                          aria-current={active ? "page" : undefined}
                          onClick={onNavigate}
                          className={cn(
                            rowBase,
                            active
                              ? cn(SIDEBAR_TONES.active, "font-semibold shadow-sm")
                              : SIDEBAR_TONES.hover,
                          )}
                        >
                          <span data-dock-icon className={iconBox}>
                            <Icon className="h-full w-full" aria-hidden />
                          </span>
                          <span
                            data-dock-label
                            className={cn(
                              collapsed
                                ? "sr-only"
                                : "truncate transition-transform duration-150 ease-out motion-reduce:transition-none",
                            )}
                          >
                            {item.label}
                          </span>
                        </Link>
                      </RailTip>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div
        className={cn(
          "border-t border-white/20",
          collapsed ? "flex flex-col items-center gap-1 p-2" : "p-3",
        )}
      >
        {collapsed ? (
          <RailTip show label={`${user.name} - ${user.email}`}>
            <span
              tabIndex={0}
              aria-label={`Signed in as ${user.name}`}
              className="bg-midnight-teal/85 mb-1 flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
            >
              {initials(user.name)}
            </span>
          </RailTip>
        ) : (
          <>
            <p className="truncate px-3 text-sm font-medium text-white">{user.name}</p>
            <p className="truncate px-3 text-xs text-white">{user.email}</p>
            {user.roleLabels.length ? (
              <p className={cn(SIDEBAR_TONES.role, "truncate px-3 text-xs")}>
                {user.roleLabels.join(" · ")}
              </p>
            ) : null}
          </>
        )}
        <RailTip show={collapsed} label="Change password">
          <Link
            href="/account/password"
            onClick={onNavigate}
            aria-label={collapsed ? "Change password" : undefined}
            className={cn(
              SIDEBAR_TONES.hover,
              "flex items-center rounded-lg text-sm text-white",
              collapsed ? "h-10 w-10 justify-center" : "mt-2 gap-3 px-3 py-2",
            )}
          >
            <KeyRound className="h-4 w-4 shrink-0" aria-hidden />
            {collapsed ? null : "Change password"}
          </Link>
        </RailTip>
        <RailTip show={collapsed} label="Sign out">
          <SignOutButton compact={collapsed} className={SIDEBAR_TONES.hover} />
        </RailTip>
      </div>
    </div>
  );
}

/**
 * Application frame: Earth Green AECOM header bar, the floating navigation panel (collapsible to
 * an icon rail on large screens, a drawer on small screens) and the content area, which takes the
 * freed width when the panel is collapsed. Navigation items are pre-filtered on the server by
 * permission; this component only renders what it is given.
 */
export function Shell({
  nav,
  user,
  plannerUrl,
  children,
}: {
  nav: NavGroup[];
  user: ShellUser;
  /** Resource Planner app, shown in the header when configured in Settings. */
  plannerUrl?: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  return (
    <Tooltip.Provider delayDuration={150} skipDelayDuration={300}>
      <div className="flex min-h-screen flex-col">
        {/* Keyboard users reach the page content without walking the whole navigation first. */}
        <a
          href="#main"
          className="bg-surface text-brand-primary focus:ring-brand-primary sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2 focus:ring-2"
        >
          Skip to content
        </a>
        <header className="bg-brand-primary sticky top-0 z-30 flex h-14 items-center gap-3 px-4 text-white">
          <button
            type="button"
            className="hover:bg-brand-primary-hover rounded-md p-1 lg:hidden"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <Link href="/" className="flex items-center gap-3">
            <Wordmark tone="light" />
          </Link>
          {plannerUrl ? (
            <a
              href={plannerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-brand-primary-hover ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-sm text-white/85 hover:text-white"
            >
              Resource Planner <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : null}
          <span
            className={cn(
              "from-lime-green via-sunrise-yellow to-ocean-teal h-2 w-24 rounded-full bg-gradient-to-r",
              plannerUrl ? "" : "ml-auto",
            )}
            aria-hidden
          />
        </header>
        <div className="bg-surface-muted flex flex-1">
          {/* Floating panel: a small margin from the screen edge, follows the page while it scrolls. */}
          <aside
            id="hub-sidebar"
            data-collapsed={collapsed ? "true" : "false"}
            className={cn(
              "sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 p-3 pr-0 transition-[width] duration-200 ease-out motion-reduce:transition-none lg:block",
              collapsed ? "w-[calc(60px+0.75rem)]" : "w-[calc(15rem+0.75rem)]",
            )}
          >
            <SidebarPanel
              nav={nav}
              user={user}
              collapsed={collapsed}
              onToggle={() => setCollapsed(!collapsed)}
            />
          </aside>
          {open ? (
            <div
              className="fixed inset-0 z-40 lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/50"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              />
              <aside className="relative h-full w-72 p-3">
                <button
                  type="button"
                  className="hover:bg-brand-primary-hover absolute top-5 right-5 z-10 rounded-md p-1 text-white"
                  aria-label="Close navigation"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
                <SidebarPanel
                  nav={nav}
                  user={user}
                  collapsed={false}
                  onNavigate={() => setOpen(false)}
                />
              </aside>
            </div>
          ) : null}
          <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </Tooltip.Provider>
  );
}
