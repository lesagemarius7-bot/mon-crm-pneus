import { listCustomFieldDefinitions } from "@/lib/queries/custom-fields";
import { CustomFieldsPanel } from "@/components/custom-fields/custom-fields-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function SettingsPage() {
  const definitions = await listCustomFieldDefinitions();

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b px-4 py-3">
        <h1 className="font-semibold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Configuration du CRM — objets et champs personnalisés.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <Tabs defaultValue="custom-fields">
          <TabsList>
            <TabsTrigger value="custom-fields">Champs personnalisés</TabsTrigger>
          </TabsList>
          <TabsContent value="custom-fields" className="mt-4">
            <CustomFieldsPanel definitions={definitions} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
