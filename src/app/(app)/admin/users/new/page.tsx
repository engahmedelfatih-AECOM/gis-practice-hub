import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { CreateUserForm } from "../user-forms";
import { createUserAction } from "../actions";

export const metadata: Metadata = { title: "New user" };

export default function NewUserPage() {
  return (
    <>
      <PageHeader
        title="New user"
        description="Creates a local account. Roles are granted on the next screen."
        crumbs={[
          { label: "Administration" },
          { label: "Users & roles", href: "/admin/users" },
          { label: "New" },
        ]}
      />
      <CreateUserForm action={createUserAction} />
    </>
  );
}
