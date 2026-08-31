"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Guards the Tasks Kanban board specifically: a render exception anywhere
 * in the DnD tree (a null field on an unexpected task/company/contact
 * shape, a dnd-kit edge case, ...) is caught here instead of taking the
 * whole /tasks page down. React error boundaries must be classes — there
 * is no hook equivalent.
 */
export class KanbanErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Kanban tâches — erreur de rendu :", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertTriangle className="size-6 text-destructive" />
          <p className="text-sm font-medium">La vue Kanban n&apos;a pas pu s&apos;afficher.</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Une erreur inattendue est survenue. Réessaie, ou repasse en vue Table en attendant.
          </p>
          <Button size="sm" variant="outline" onClick={() => this.setState({ hasError: false })}>
            Réessayer
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
