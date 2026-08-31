"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import type { CompanyDuplicateCandidate } from "@/lib/queries/companies";
import { Button } from "@/components/ui/button";
import { MergeCompaniesDialog } from "@/components/companies/merge-companies-dialog";

/** Alert banner shown at the top of the Company drawer when another
 * company shares the same name or SIRET — offers a one-click path into
 * the merge dialog for each candidate. */
export function CompanyMergeAlert({
  companyId,
  duplicates,
  onMerged,
}: {
  companyId: string;
  duplicates: CompanyDuplicateCandidate[];
  /** Called after a successful merge with the surviving company's id — the
   * caller decides whether to refetch (kept === companyId) or close (the
   * currently-open company was the one removed). */
  onMerged: (keptId: string) => void;
}) {
  const [mergeTarget, setMergeTarget] = useState<string | null>(null);

  if (duplicates.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs">
      <div className="flex items-start gap-2 text-amber-700 dark:text-amber-500">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Doublon potentiel détecté ({duplicates.length > 1 ? "mêmes nom/SIRET" : "même nom ou SIRET"}) :
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {duplicates.map((duplicate) => (
          <li key={duplicate.id} className="flex items-center justify-between gap-2">
            <span className="truncate text-muted-foreground">
              {duplicate.name}
              {duplicate.city ? ` — ${duplicate.city}` : ""}
              {duplicate.siret ? ` (${duplicate.siret})` : ""}
            </span>
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="shrink-0"
              onClick={() => setMergeTarget(duplicate.id)}
            >
              Fusionner
            </Button>
          </li>
        ))}
      </ul>

      {mergeTarget && (
        <MergeCompaniesDialog
          companyAId={companyId}
          companyBId={mergeTarget}
          open
          onOpenChange={(open) => !open && setMergeTarget(null)}
          onMerged={(keptId) => {
            setMergeTarget(null);
            onMerged(keptId);
          }}
        />
      )}
    </div>
  );
}
