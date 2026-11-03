"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
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

/**
 * Application frame: Earth Green AECOM header bar and navigation (collapsible on
 * small screens), content area. Navigation items are pre-filtered on the server
 * by permission; this component only renders what it is given.
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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col gap-6 px-3 py-4">
      {nav.map((group) => (
        <div key={group.label ?? "root"}>
          {group.label ? (
            <p className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-white/70 uppercase">
              {group.label}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              // Section homes ("/", "/hub") highlight only on exact match; other items on prefix.
              const active = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                      active
                        ? "bg-brand-primary-hover text-white"
                        : "hover:bg-brand-primary-hover text-white/85 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="mt-auto border-t border-white/20 pt-4">
        <p className="truncate px-3 text-sm font-medium text-white">{user.name}</p>
        <p className="truncate px-3 text-xs text-white/70">{user.email}</p>
        {user.roleLabels.length ? (
          <p className="text-lime-green truncate px-3 text-xs">{user.roleLabels.join(" · ")}</p>
        ) : null}
        <Link
          href="/account/password"
          onClick={() => setOpen(false)}
          className="hover:bg-brand-primary-hover mt-2 block rounded-md px-3 py-2 text-sm text-white/85 hover:text-white"
        >
          Change password
        </Link>
        <SignOutButton />
      </div>
    </nav>
  );

  return (
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
          {open ? <Menu className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
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
      <div className="flex flex-1">
        <aside className="bg-brand-primary hidden w-60 shrink-0 lg:block">{sidebar}</aside>
        {open ? (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
            />
            <aside className="bg-brand-primary relative h-full w-64 shadow-xl">
              <button
                type="button"
                className="hover:bg-brand-primary-hover absolute top-3 right-3 rounded-md p-1 text-white/85"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </aside>
          </div>
        ) : null}
        <main id="main" className="bg-surface-muted min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
