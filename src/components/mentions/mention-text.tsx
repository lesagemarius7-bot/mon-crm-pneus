import type { ReactNode } from "react";

import { extractMentions } from "@/lib/mentions";

/** Renders stored note/activity text, replacing @[Name](id) mention tokens
 * with a styled "@Name" span. Plain text otherwise. */
export function MentionText({ text, className }: { text: string; className?: string }) {
  const mentions = extractMentions(text);
  if (mentions.length === 0) return <span className={className}>{text}</span>;

  const parts: ReactNode[] = [];
  let cursor = 0;
  mentions.forEach((mention, index) => {
    if (mention.index > cursor) parts.push(text.slice(cursor, mention.index));
    parts.push(
      <span key={index} className="font-medium text-primary">
        @{mention.name}
      </span>
    );
    cursor = mention.index + mention.length;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <span className={className}>{parts}</span>;
}
