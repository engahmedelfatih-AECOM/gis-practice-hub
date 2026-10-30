"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/input";

/** Project selector (the cream cell B4 of the Delivery Tracker sheet). */
export function ProjectSelect({ projects, selected, basePath }: { projects: { id: string; name: string }[]; selected: string; basePath: string }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">Project</span>
      <Select value={selected} onChange={(e) => router.push(`${basePath}?project=${e.target.value}`)} className="bg-sunrise-yellow-25 w-64" aria-label="Project">
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
    </label>
  );
}
