"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckSquare,
  KanbanSquare,
  LayoutDashboard,
  List,
  Mail,
  Settings,
  Truck,
  Users,
  Workflow,
  Zap,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

// v1: static navigation shortcuts. Once the core views have real data,
// wire this up to search companies/contacts/vehicles by name (server
// action returning matches, debounced as the user types).
const NAV_COMMANDS = [
  { label: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
  { label: "Entreprises", url: "/companies", icon: Building2 },
  { label: "Contacts", url: "/contacts", icon: Users },
  { label: "Flottes & équipements", url: "/vehicles", icon: Truck },
  { label: "Deals", url: "/deals", icon: KanbanSquare },
  { label: "Tâches", url: "/tasks", icon: CheckSquare },
  { label: "Templates d'emails", url: "/templates", icon: Mail },
  { label: "Séquences", url: "/sequences", icon: Workflow },
  { label: "Listes de contacts", url: "/lists", icon: List },
  { label: "Automatisations", url: "/automations", icon: Zap },
  { label: "Paramètres", url: "/settings", icon: Settings },
];

export const OPEN_COMMAND_PALETTE_EVENT = "command-palette:open";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenEvent);
    };
  }, []);

  function runCommand(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Recherche"
      description="Rechercher une entreprise, un contact, un véhicule ou une vue"
    >
      <CommandInput placeholder="Rechercher une entreprise, un pneu, un contact..." />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {NAV_COMMANDS.map((item) => (
            <CommandItem
              key={item.url}
              value={item.label}
              onSelect={() => runCommand(() => router.push(item.url))}
            >
              <item.icon />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
      </CommandList>
    </CommandDialog>
  );
}
