/**
 * Shared helpers for CSV import Server Actions — tolerant parsing of
 * free-text spreadsheet cells into the strict types Prisma expects.
 */

export function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[€\s ]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseOptionalInt(raw: string): number | null {
  const n = parseOptionalNumber(raw);
  return n === null ? null : Math.round(n);
}

/**
 * Resolves a free-text CSV cell to an enum value — accepts either the raw
 * enum key (e.g. "TRANSPORTEUR") or its French display label (e.g.
 * "Transporteur"), case-insensitively. Falls back to `fallback` when the
 * cell is empty or doesn't match anything, rather than failing the row —
 * type/status-like fields are convenience data, not required identifiers.
 */
export function resolveEnumValue<T extends string>(
  raw: string,
  enumObj: Record<string, T>,
  labels: Record<T, string>,
  fallback: T
): T {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;

  const upperKey = trimmed.toUpperCase().replace(/[\s-]+/g, "_");
  if (upperKey in enumObj) return enumObj[upperKey];

  const normalizedInput = trimmed.toLowerCase();
  const labelMatch = (Object.entries(labels) as [T, string][]).find(
    ([, label]) => label.toLowerCase() === normalizedInput
  );
  return labelMatch ? labelMatch[0] : fallback;
}

/**
 * Splits a combined "Prénom Nom" string on the first space. Used when a
 * CSV only has one name column mapped to either firstName or lastName —
 * the other stays empty, so we recover both from whichever one has text.
 */
export function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: "" };
  }
  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1),
  };
}
