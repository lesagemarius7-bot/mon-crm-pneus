"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { ProfileOption } from "@/lib/queries/profiles";
import { listProfileOptionsAction } from "@/lib/actions/profiles";
import { cn } from "@/lib/utils";
import { assigneeLabel } from "@/components/assignee/assignee-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";

type Trigger = { start: number; query: string };

/** Detects an active "@query" mention trigger ending at `cursor` — the "@"
 * must be at the start of the text or preceded by whitespace, and the query
 * itself must not contain whitespace (typing past a space closes it). */
function findMentionTrigger(text: string, cursor: number): Trigger | null {
  const upToCursor = text.slice(0, cursor);
  const at = upToCursor.lastIndexOf("@");
  if (at === -1) return null;
  const before = at === 0 ? "" : upToCursor[at - 1];
  if (before && !/\s/.test(before)) return null;
  const query = upToCursor.slice(at + 1);
  if (/\s/.test(query)) return null;
  return { start: at, query };
}

/** Drop-in replacement for <Textarea> that adds Slack-style "@member"
 * mention autocomplete — typing "@" opens a dropdown of team members
 * (profiles); picking one inserts an `@[Full Name](profileId)` token that
 * the server parses back into a notification (see src/lib/mentions.ts). */
export function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows,
  id,
  className,
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  className?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [profiles, setProfiles] = useState<ProfileOption[] | null>(null);
  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [highlighted, setHighlighted] = useState(0);

  useEffect(() => {
    listProfileOptionsAction().then(setProfiles);
  }, []);

  // The parent clears `value` after submit without going through
  // syncTrigger — treat an emptied value as an implicit trigger reset
  // instead of mirroring it into state via an effect.
  const effectiveTrigger = value === "" ? null : trigger;

  const suggestions =
    effectiveTrigger && profiles
      ? profiles
          .filter((p) => assigneeLabel(p).toLowerCase().includes(effectiveTrigger.query.toLowerCase()))
          .slice(0, 6)
      : [];

  function syncTrigger(nextValue: string, cursor: number) {
    setTrigger(findMentionTrigger(nextValue, cursor));
    setHighlighted(0);
  }

  function selectProfile(profile: ProfileOption) {
    if (!effectiveTrigger || !textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart ?? value.length;
    const label = assigneeLabel(profile);
    const before = value.slice(0, effectiveTrigger.start);
    const after = value.slice(cursor);
    const insertion = `@[${label}](${profile.id}) `;
    onChange(`${before}${insertion}${after}`);
    setTrigger(null);
    requestAnimationFrame(() => {
      const pos = before.length + insertion.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (effectiveTrigger && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectProfile(suggestions[highlighted]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setTrigger(null);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        id={id}
        rows={rows}
        placeholder={placeholder}
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          syncTrigger(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onKeyDown={handleKeyDown}
        onClick={(e) => syncTrigger(value, e.currentTarget.selectionStart ?? value.length)}
        onKeyUp={(e) => syncTrigger(value, e.currentTarget.selectionStart ?? value.length)}
      />
      {effectiveTrigger && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md">
          {suggestions.map((profile, index) => (
            <button
              key={profile.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                selectProfile(profile);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                index === highlighted && "bg-accent"
              )}
            >
              <Avatar size="sm">
                {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt="" />}
                <AvatarFallback className="text-[10px]">
                  {assigneeLabel(profile)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{assigneeLabel(profile)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
