import { listContactLists } from "@/lib/queries/contact-lists";
import { ListFormDialog } from "@/components/lists/list-form-dialog";
import { ListsPanel } from "@/components/lists/lists-panel";

export default async function ListsPage() {
  const lists = await listContactLists();

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="font-semibold">Listes de contacts</h1>
          <p className="text-sm text-muted-foreground">
            {lists.length} liste{lists.length > 1 ? "s" : ""} — segments statiques ou
            dynamiques par filtres.
          </p>
        </div>
        <ListFormDialog mode="create" />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <ListsPanel lists={lists} />
      </div>
    </div>
  );
}
