"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { authClient } from "./auth-client";

/** Sign-out control of the navigation panel; `compact` is the icon-only form of the collapsed rail. */
export function SignOutButton({
  compact = false,
  className,
  ...rest
}: { compact?: boolean } & Omit<ComponentProps<"button">, "onClick" | "children">) {
  const router = useRouter();
  return (
    <button
      {...rest}
      type="button"
      aria-label={compact ? "Sign out" : undefined}
      onClick={async () => {
        await authClient.signOut();
        router.replace("/login");
        router.refresh();
      }}
      className={cn(
        "flex items-center rounded-lg text-sm text-white",
        compact ? "h-10 w-10 justify-center" : "w-full gap-3 px-3 py-2",
        className,
      )}
    >
      <LogOut className="h-4 w-4 shrink-0" aria-hidden />
      {compact ? null : "Sign out"}
    </button>
  );
}
