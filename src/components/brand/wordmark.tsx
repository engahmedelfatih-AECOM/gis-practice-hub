import { cn } from "@/lib/cn";

/**
 * Application wordmark: "GIS Practice | GIS Hub". The practice name is set in bold,
 * the application name in regular weight. `tone="light"` is for the Earth Green header,
 * `tone="brand"` renders in Earth Green on light backgrounds.
 */
export function Wordmark({
  tone = "light",
  className,
  size = "md",
}: {
  tone?: "light" | "brand";
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "text-sm", md: "text-base", lg: "text-2xl" } as const;
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-2 font-sans tracking-tight whitespace-nowrap",
        sizes[size],
        tone === "light" ? "text-white" : "text-brand-primary",
        className,
      )}
    >
      <span className="font-bold">GIS Practice</span>
      <span aria-hidden className={tone === "light" ? "text-white/60" : "text-brand-primary/50"}>
        |
      </span>
      <span className="font-medium">GIS Hub</span>
    </span>
  );
}
