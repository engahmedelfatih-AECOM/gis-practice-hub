import type { RegisterKey } from "@/domain/hub/registers";
import { DeleteControl } from "@/components/ui/delete-control";
import { ActionForm, FormMessage } from "@/components/ui/form";
import { deleteRowAction } from "./actions";

/** The bin at the end of a register row: its own small form, so it never touches the row's edit form. */
export function DeleteRowForm({
  register,
  id,
  name,
  usedBy,
}: {
  register: RegisterKey;
  id: string;
  name: string;
  usedBy: string | null;
}) {
  return (
    <ActionForm action={deleteRowAction} className="space-y-1">
      <input type="hidden" name="__register" value={register} />
      <input type="hidden" name="id" value={id} />
      <DeleteControl
        mode="icon"
        name={name}
        usedBy={usedBy}
        description="GIS-STD-001 keeps history: delete only a row entered by mistake."
      />
      <FormMessage />
    </ActionForm>
  );
}
