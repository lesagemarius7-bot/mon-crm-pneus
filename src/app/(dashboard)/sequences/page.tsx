import { processDueSequenceStepsAction } from "@/lib/actions/sequences";
import { listSequences } from "@/lib/queries/sequences";
import { SequenceFormDialog } from "@/components/sequences/sequence-form-dialog";
import { SequencesPanel } from "@/components/sequences/sequences-panel";

export default async function SequencesPage() {
  // No cron in this app — advance any due steps opportunistically on load,
  // in addition to the manual "Exécuter les étapes dues" button.
  await processDueSequenceStepsAction();
  const sequences = await listSequences();

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="font-semibold">Séquences</h1>
          <p className="text-sm text-muted-foreground">
            {sequences.length} séquence{sequences.length > 1 ? "s" : ""} — emails et tâches
            planifiés sur plusieurs jours.
          </p>
        </div>
        <SequenceFormDialog mode="create" />
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <SequencesPanel sequences={sequences} />
      </div>
    </div>
  );
}
