/**
 * Mentions are stored inline as `@[Full Name](profileId)` tokens — inserted
 * by MentionTextarea when a member is picked from the autocomplete list, and
 * parsed back out here. Storing the id (not just the name) makes detection
 * exact instead of fuzzy-matching free text against the profiles table.
 */
const MENTION_PATTERN =
  /@\[([^\]]+)\]\(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)/g;

export type MentionMatch = {
  name: string;
  profileId: string;
  index: number;
  length: number;
};

export function extractMentions(text: string): MentionMatch[] {
  const matches: MentionMatch[] = [];
  const regex = new RegExp(MENTION_PATTERN);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    matches.push({ name: match[1], profileId: match[2], index: match.index, length: match[0].length });
  }
  return matches;
}

/** Renders mention tokens back down to plain "@Name" text — used for
 * notification snippets and any other plain-text rendering of note/activity
 * content. */
export function stripMentionSyntax(text: string): string {
  return text.replace(new RegExp(MENTION_PATTERN), (_match, name: string) => `@${name}`);
}
