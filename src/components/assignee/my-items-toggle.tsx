"use client";

import { Users, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Quick "Tout l'équipe" / "Attribué à moi" filter used at the top of the
 * Companies/Contacts/Deals/Tasks views. */
export function MyItemsToggle({
  mineOnly,
  onChange,
}: {
  mineOnly: boolean;
  onChange: (mineOnly: boolean) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-md border p-0.5">
      <Button
        type="button"
        variant={!mineOnly ? "secondary" : "ghost"}
        size="sm"
        className="h-7 gap-1.5 px-2"
        onClick={() => onChange(false)}
      >
        <Users className="size-3.5" />
        Tout l&apos;équipe
      </Button>
      <Button
        type="button"
        variant={mineOnly ? "secondary" : "ghost"}
        size="sm"
        className="h-7 gap-1.5 px-2"
        onClick={() => onChange(true)}
      >
        <UserRound className="size-3.5" />
        Attribué à moi
      </Button>
    </div>
  );
}
