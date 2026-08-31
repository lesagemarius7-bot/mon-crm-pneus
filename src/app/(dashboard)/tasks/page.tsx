import { listCompanyOptions } from "@/lib/queries/companies";
import { listDealOptions } from "@/lib/queries/deals";
import { TasksView } from "@/components/tasks/tasks-view";

export default async function TasksPage() {
  const [companies, deals] = await Promise.all([
    listCompanyOptions(),
    listDealOptions(),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b px-4 py-3">
        <h1 className="font-semibold">Tâches</h1>
        <p className="text-sm text-muted-foreground">
          Appels, relances, RDV et démonstrations à venir.
        </p>
      </div>
      <div className="min-h-0 flex-1">
        <TasksView companies={companies} deals={deals} />
      </div>
    </div>
  );
}
