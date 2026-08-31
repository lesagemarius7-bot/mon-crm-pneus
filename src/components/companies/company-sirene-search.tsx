"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, Search, X } from "lucide-react";

import type { CompanySuggestion } from "@/lib/company-lookup";
import { searchCompanyDirectoryAction } from "@/lib/actions/company-lookup";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Sirene ("Recherche d'entreprises", recherche-entreprises.api.gouv.fr —
 * free, no API key) search box for the "Nouvelle entreprise" dialog.
 * Typing a name or SIRET shows matching real companies; picking one hands
 * the full suggestion (adresse, SIRET, secteur, effectif, lien LinkedIn
 * deviné) back to the caller via `onPick` to pre-fill the rest of the form.
 * `onPick(null)` signals the selection was cleared.
 */
export function CompanySireneSearch({
  onPick,
}: {
  onPick: (suggestion: CompanySuggestion | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<CompanySuggestion | null>(null);

  // Only ever setState from within the timeout/promise callbacks below —
  // never synchronously in the effect body itself (react-hooks/set-state-
  // in-effect) — the "too short / already picked" case is instead handled
  // synchronously in handleQueryChange, an event handler.
  useEffect(() => {
    const trimmed = query.trim();
    if (picked || trimmed.length < 2) return;
    const timeout = setTimeout(() => {
      searchCompanyDirectoryAction(trimmed).then((result) => {
        setSuggestions(result);
        setLoading(false);
      });
    }, 350);
    return () => clearTimeout(timeout);
  }, [query, picked]);

  function handleQueryChange(value: string) {
    setPicked(null);
    setQuery(value);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  function handlePick(suggestion: CompanySuggestion) {
    setPicked(suggestion);
    setQuery(suggestion.name);
    setSuggestions([]);
    onPick(suggestion);
  }

  function handleClear() {
    setPicked(null);
    setQuery("");
    setSuggestions([]);
    onPick(null);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="company-sirene-search">Rechercher une entreprise (base Sirene)</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="company-sirene-search"
          className="pl-8"
          placeholder="Nom ou SIRET de l'entreprise..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {picked && !loading && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Effacer la sélection"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="max-h-56 overflow-y-auto rounded-lg border bg-popover p-1 shadow-sm">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.siren}
              type="button"
              onClick={() => handlePick(suggestion)}
              className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <Building2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{suggestion.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[suggestion.address, suggestion.postalCode, suggestion.city]
                    .filter(Boolean)
                    .join(", ") || suggestion.siren}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
