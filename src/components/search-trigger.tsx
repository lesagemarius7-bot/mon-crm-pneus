"use client";

import { Search } from "lucide-react";

import { OPEN_COMMAND_PALETTE_EVENT } from "@/components/command-palette";

export function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))}
      className="hidden items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted sm:flex"
    >
      <Search className="size-3.5" />
      <span>Rechercher...</span>
      <kbd className="ml-4 rounded border bg-background px-1.5 font-mono text-[10px]">
        ⌘K
      </kbd>
    </button>
  );
}
