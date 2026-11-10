"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/input";

/** The bi-weekly period selector (the cream cell of the Dashboard). Changes the page query string. */
export interface PeriodOption {
  id: string;
  label: string;
}

export function PeriodSelect({ periods, selected, basePath, extra, current }: { periods: PeriodOption[]; selected: string; basePath: string; extra?: Record<string, string>; /** Id of the period the GIS Manager set as current, marked in the list. */ current?: string | null }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">Report period</span>
      <Select
        value={selected}
        onChange={(e) => {
          const u = new URLSearchParams({ ...(extra ?? {}), period: e.target.value });
          router.push(`${basePath}?${u.toString()}`);
        }}
        className="bg-sunrise-yellow-25 w-64"
        aria-label="Report period"
      >
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
            {current && p.id === current ? " - current" : ""}
          </option>
        ))}
      </Select>
    </label>
  );
}
