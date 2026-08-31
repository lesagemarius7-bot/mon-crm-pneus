import { Plus } from "lucide-react";

import { getCurrentUserId } from "@/lib/auth";
import { listCompanyOptions } from "@/lib/queries/companies";
import { listContacts } from "@/lib/queries/contacts";
import { listProfileOptions } from "@/lib/queries/profiles";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { Button } from "@/components/ui/button";

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const [contacts, companies, profiles, currentUserId] = await Promise.all([
    listContacts(),
    listCompanyOptions(),
    listProfileOptions(),
    getCurrentUserId(),
  ]);
  const { id } = await searchParams;
  const initialSelectedId = typeof id === "string" ? id : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="font-semibold">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            {contacts.length} contact{contacts.length > 1 ? "s" : ""}
          </p>
        </div>
        <ContactFormDialog
          mode="create"
          companies={companies}
          trigger={
            <Button size="sm">
              <Plus />
              Nouveau contact
            </Button>
          }
        />
      </div>
      <div className="min-h-0 flex-1">
        <ContactsTable
          data={contacts}
          companies={companies}
          profiles={profiles}
          currentUserId={currentUserId}
          initialSelectedId={initialSelectedId}
        />
      </div>
    </div>
  );
}
