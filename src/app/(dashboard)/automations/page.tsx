import { listEmailTemplateOptions } from "@/lib/queries/email-templates";
import { listAutomations } from "@/lib/queries/automations";
import { AutomationFormDialog } from "@/components/automations/automation-form-dialog";
import { AutomationsPanel } from "@/components/automations/automations-panel";

export default async function AutomationsPage() {
  const [automations, templates] = await Promise.all([
    listAutomations(),
    listEmailTemplateOptions(),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="font-semibold">Automatisations</h1>
          <p className="text-sm text-muted-foreground">
            {automations.length} règle{automations.length > 1 ? "s" : ""} — déclenchées au
            changement d&apos;étape d&apos;un deal.
          </p>
        </div>
        <AutomationFormDialog mode="create" templates={templates} />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <AutomationsPanel automations={automations} templates={templates} />
      </div>
    </div>
  );
}
