import "server-only";

import { EMPLOYEE_RANGE_LABELS, NAF_SECTION_LABELS } from "@/lib/naf-labels";

const SEARCH_URL = "https://recherche-entreprises.api.gouv.fr/search";

type SireneSiege = {
  siret: string | null;
  adresse: string | null;
  libelle_voie: string | null;
  complement_adresse: string | null;
  code_postal: string | null;
  libelle_commune: string | null;
};

type SireneResult = {
  siren: string;
  nom_complet: string | null;
  nom_raison_sociale: string | null;
  etat_administratif: string | null;
  section_activite_principale: string | null;
  tranche_effectif_salarie: string | null;
  siege: SireneSiege | null;
};

type SireneResponse = { results?: SireneResult[] };

export type CompanySuggestion = {
  siren: string;
  siret: string | null;
  name: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  sector: string | null;
  employeeRange: string | null;
  linkedin: string | null;
};

/** Best-effort LinkedIn company-page guess from the legal name — LinkedIn
 * vanity URLs are frequently just the slugified trade name, but this is a
 * heuristic (not authoritative data from the Sirene search), so it should
 * always stay editable by the user. */
function guessLinkedInUrl(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `https://www.linkedin.com/company/${slug}`;
}

function normalize(result: SireneResult): CompanySuggestion {
  const siege = result.siege;
  const address = [siege?.libelle_voie, siege?.complement_adresse].filter(Boolean).join(" ") || null;
  const name = result.nom_complet ?? result.nom_raison_sociale ?? "Entreprise sans nom";

  return {
    siren: result.siren,
    siret: siege?.siret ?? null,
    name,
    address,
    city: siege?.libelle_commune ?? null,
    postalCode: siege?.code_postal ?? null,
    sector: result.section_activite_principale
      ? (NAF_SECTION_LABELS[result.section_activite_principale] ?? null)
      : null,
    employeeRange: result.tranche_effectif_salarie
      ? (EMPLOYEE_RANGE_LABELS[result.tranche_effectif_salarie] ?? null)
      : null,
    linkedin: guessLinkedInUrl(name),
  };
}

/**
 * Free-text company search against the French government's "Recherche
 * d'entreprises" API (recherche-entreprises.api.gouv.fr) — public, no API
 * key. Used to power the "Nouvelle entreprise" dialog's enrichment
 * autocomplete: picking a suggestion pre-fills name/SIRET/adresse/secteur/
 * effectif/LinkedIn.
 */
export async function searchCompanyDirectory(query: string): Promise<CompanySuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = `${SEARCH_URL}?q=${encodeURIComponent(trimmed)}&limit=6`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return [];

    const data = (await response.json()) as SireneResponse;
    return (data.results ?? [])
      .filter((result) => result.etat_administratif === "A")
      .map(normalize);
  } catch {
    return [];
  }
}
