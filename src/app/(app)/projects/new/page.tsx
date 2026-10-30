import type { Metadata } from "next";
import { PROJECTS } from "@/domain/hub/registers";
import type { SearchParams } from "@/app/_lib/actions";
import { NewRowBody } from "@/app/(app)/[register]/new/page";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage({ searchParams }: { searchParams: SearchParams }) {
  return <NewRowBody def={PROJECTS} sp={await searchParams} />;
}
