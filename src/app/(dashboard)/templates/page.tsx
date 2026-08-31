import { getCurrentUserId } from "@/lib/auth";
import { listEmailTemplates } from "@/lib/queries/email-templates";
import { listProfileOptions } from "@/lib/queries/profiles";
import { TemplateFormDialog } from "@/components/templates/template-form-dialog";
import { TemplatesPanel } from "@/components/templates/templates-panel";

export default async function TemplatesPage() {
  const [templates, profiles, currentUserId] = await Promise.all([
    listEmailTemplates(),
    listProfileOptions(),
    getCurrentUserId(),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="font-semibold">Templates d&apos;emails</h1>
          <p className="text-sm text-muted-foreground">
            {templates.length} template{templates.length > 1 ? "s" : ""} — réutilisables dans
            les séquences et les automatisations.
          </p>
        </div>
        <TemplateFormDialog mode="create" />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <TemplatesPanel
          templates={templates}
          profiles={profiles}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
