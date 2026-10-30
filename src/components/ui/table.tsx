import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="border-border bg-surface w-full overflow-x-auto rounded-lg border">
      <table className={cn("w-full text-left text-sm", className)} {...props} />
    </div>
  );
}
export function THead({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      className={cn("bg-surface-muted text-xs tracking-wide text-gray-600 uppercase", className)}
      {...props}
    />
  );
}
export function TBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody className={cn("divide-border divide-y", className)} {...props} />;
}
export function TR({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("hover:bg-gray-50", className)} {...props} />;
}
export function TH({ className, ...props }: ComponentProps<"th">) {
  return <th scope="col" className={cn("px-4 py-3 font-medium", className)} {...props} />;
}
export function TD({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-4 py-3 align-middle", className)} {...props} />;
}
