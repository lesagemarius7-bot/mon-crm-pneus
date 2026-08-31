/**
 * Shared {{variable}} substitution for email templates — used both by the
 * template editor's live preview (client) and sequence/automation
 * execution (server) so the two never drift apart.
 */

export type TemplateContext = {
  contact?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  company?: {
    name?: string | null;
    city?: string | null;
    type?: string | null;
  } | null;
  deal?: {
    name?: string | null;
    amount?: number | null;
    stage?: string | null;
  } | null;
};

const TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

function resolvePath(context: TemplateContext, path: string): string {
  const [scope, field] = path.split(".");
  const scoped = (context as Record<string, unknown>)[scope];
  if (!scoped || typeof scoped !== "object") return "";
  const value = (scoped as Record<string, unknown>)[field];
  if (value === null || value === undefined) return "";
  return String(value);
}

/** Replaces every {{scope.field}} token in `text` with its value from
 * `context`, or an empty string when the field/context is missing. */
export function renderTemplate(text: string, context: TemplateContext): string {
  return text.replace(TOKEN_PATTERN, (_match, path: string) => resolvePath(context, path));
}

/** Extracts the distinct {{scope.field}} tokens used in `text`, for the
 * EmailTemplate.variables column and the editor's "variables used" list. */
export function extractVariables(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    found.add(match[1]);
  }
  return Array.from(found);
}

/** Sample data for the template editor's preview — not tied to any real
 * record. */
export const SAMPLE_TEMPLATE_CONTEXT: TemplateContext = {
  contact: { firstName: "Julien", lastName: "Martin", email: "julien.martin@exemple.fr" },
  company: { name: "Transports Lefèvre & Fils", city: "Lyon", type: "Transporteur" },
  deal: { name: "Renouvellement flotte 2026", amount: 18500, stage: "Négociation" },
};

/** The variable tokens offered in the template editor's helper UI. */
export const AVAILABLE_TEMPLATE_VARIABLES = [
  "contact.firstName",
  "contact.lastName",
  "contact.email",
  "contact.phone",
  "company.name",
  "company.city",
  "company.type",
  "deal.name",
  "deal.amount",
  "deal.stage",
] as const;
