import type { Metadata } from "next";
import { PROJECTS } from "@/domain/hub/registers";
import type { Params } from "@/app/_lib/actions";
import { EditRowBody } from "@/app/(app)/[register]/[id]/page";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: { params: Params<{ id: string }> }) {
  const { id } = await params;
  return <EditRowBody def={PROJECTS} id={id} />;
}
