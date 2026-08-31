"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentUserId } from "@/lib/auth";
import { notifyMentions } from "@/lib/notifications";
import { getPrisma } from "@/lib/prisma";
import { timelineEntityLink } from "@/lib/timeline-links";

const noteSchema = z.object({
  content: z.string().trim().min(1, "Le contenu est requis."),
  companyId: z.string().min(1).nullable().optional(),
  dealId: z.string().min(1).nullable().optional(),
});

export type NoteInput = z.infer<typeof noteSchema>;

export async function createNoteAction(input: NoteInput) {
  const parsed = noteSchema.parse(input);
  const prisma = getPrisma();
  const authorId = await getCurrentUserId();

  const note = await prisma.note.create({
    data: {
      content: parsed.content,
      companyId: parsed.companyId || null,
      dealId: parsed.dealId || null,
      authorId: authorId ?? undefined,
    },
  });

  await notifyMentions({
    text: parsed.content,
    actorId: authorId,
    link: timelineEntityLink({ companyId: parsed.companyId, dealId: parsed.dealId }),
  });

  if (parsed.companyId) revalidatePath("/companies");
  if (parsed.dealId) revalidatePath("/deals");
  return note.id;
}
