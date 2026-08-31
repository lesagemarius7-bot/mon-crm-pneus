"use client";

import { useState } from "react";
import {
  ArrowRightLeft,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Send,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";

import { STAGE_CHANGE_PREFIX, type TimelineEntry } from "@/lib/activity-timeline";
import { createActivityAction, getActivitiesAction } from "@/lib/actions/activities";
import { createNoteAction } from "@/lib/actions/notes";
import { formatDateTime } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MentionText } from "@/components/mentions/mention-text";
import { MentionTextarea } from "@/components/mentions/mention-textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type QuickEntryType = "NOTE" | "APPEL" | "RENDEZ_VOUS" | "EMAIL";

const QUICK_ENTRY_OPTIONS: { value: QuickEntryType; label: string }[] = [
  { value: "NOTE", label: "Note" },
  { value: "APPEL", label: "Appel" },
  { value: "RENDEZ_VOUS", label: "Rendez-vous" },
  { value: "EMAIL", label: "Email" },
];

function iconFor(entry: TimelineEntry) {
  if (entry.kind === "note") {
    return { Icon: StickyNote, className: "bg-amber-500/15 text-amber-600" };
  }
  if (entry.subject.startsWith(STAGE_CHANGE_PREFIX)) {
    return { Icon: ArrowRightLeft, className: "bg-violet-500/15 text-violet-600" };
  }
  switch (entry.activityType) {
    case "APPEL":
      return { Icon: Phone, className: "bg-blue-500/15 text-blue-600" };
    case "RENDEZ_VOUS":
      return { Icon: CalendarDays, className: "bg-emerald-500/15 text-emerald-600" };
    case "EMAIL":
      return { Icon: Mail, className: "bg-sky-500/15 text-sky-600" };
    case "RELEVE_DE_PARC":
      return { Icon: ClipboardList, className: "bg-orange-500/15 text-orange-600" };
    case "TACHE":
      return { Icon: CheckSquare, className: "bg-teal-500/15 text-teal-600" };
    default:
      return { Icon: MessageSquare, className: "bg-muted text-muted-foreground" };
  }
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  const { Icon, className } = iconFor(entry);
  return (
    <li className="flex gap-3">
      <div
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
          className
        )}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1 border-b pb-3">
        {entry.kind === "note" ? (
          <MentionText text={entry.content} className="whitespace-pre-wrap text-sm" />
        ) : (
          <>
            <p className="text-sm font-medium">{entry.subject}</p>
            {entry.description && (
              <MentionText
                text={entry.description}
                className="mt-0.5 block whitespace-pre-wrap text-sm text-muted-foreground"
              />
            )}
          </>
        )}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {entry.kind === "note" && entry.authorName && <span>{entry.authorName} ·</span>}
          {entry.kind === "activity" && entry.ownerName && (
            <span className="flex items-center gap-1">
              <Avatar size="sm" className="size-4">
                {entry.ownerAvatarUrl && <AvatarImage src={entry.ownerAvatarUrl} alt="" />}
                <AvatarFallback className="text-[8px]">
                  {entry.ownerName[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {entry.activityType === "EMAIL" ? "Envoyé par" : "Par"} {entry.ownerName} ·
            </span>
          )}
          {formatDateTime(entry.createdAt)}
        </div>
      </div>
    </li>
  );
}

export function ActivityTimeline({
  companyId,
  dealId,
  initialEntries,
}: {
  companyId?: string;
  dealId?: string;
  initialEntries: TimelineEntry[];
}) {
  const [entries, setEntries] = useState(() => initialEntries);
  const [text, setText] = useState("");
  const [entryType, setEntryType] = useState<QuickEntryType>("NOTE");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const content = text.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      if (entryType === "NOTE") {
        await createNoteAction({ content, companyId, dealId });
      } else {
        await createActivityAction({
          type: entryType,
          description: content,
          companyId,
          dealId,
        });
      }
      setText("");
      const fresh = await getActivitiesAction({ companyId, dealId });
      setEntries(fresh);
      toast.success("Ajouté au fil d'activité.");
    } catch (error) {
      toast.error("Impossible d'enregistrer.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <MentionTextarea
          value={text}
          onChange={setText}
          placeholder="Rédiger une note ou consigner une activité... (@ pour mentionner)"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div className="flex items-center gap-2">
          <Select
            value={entryType}
            onValueChange={(value) =>
              setEntryType((value as QuickEntryType) ?? "NOTE")
            }
          >
            <SelectTrigger className="h-8 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUICK_ENTRY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="ml-auto"
            onClick={handleSubmit}
            disabled={submitting || !text.trim()}
          >
            {submitting ? <Loader2 className="animate-spin" /> : <Send />}
            Enregistrer
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune note ni activité pour le moment.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <TimelineItem key={`${entry.kind}-${entry.id}`} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}
