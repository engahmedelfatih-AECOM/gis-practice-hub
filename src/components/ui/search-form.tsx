import { Search } from "lucide-react";
import { Button } from "./button";
import { Checkbox, Input, Label } from "./input";

/** GET-based filter bar: state lives in the URL so views are shareable (plan §9). */
export function SearchForm({
  q,
  placeholder = "Search…",
  includeInactive,
  showInactiveToggle = true,
  children,
}: {
  q?: string | null;
  placeholder?: string;
  includeInactive?: boolean;
  showInactiveToggle?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <form method="get" className="mb-4 flex flex-wrap items-end gap-3" role="search">
      <div className="w-full sm:w-72">
        <Label htmlFor="q" className="mb-1">
          Search
        </Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <Input
            id="q"
            name="q"
            defaultValue={q ?? ""}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>
      </div>
      {children}
      {showInactiveToggle ? (
        <label className="flex h-10 items-center gap-2 text-sm text-gray-700">
          <Checkbox name="inactive" value="1" defaultChecked={includeInactive} />
          Include inactive
        </label>
      ) : null}
      <Button type="submit" variant="secondary">
        Apply
      </Button>
    </form>
  );
}
