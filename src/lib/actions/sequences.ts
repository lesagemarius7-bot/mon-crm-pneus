"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { SequenceStepAction, SequenceStepEmailSource, TaskType } from "@/generated/prisma/enums";
import { getCurrentUserId } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getSequenceDetail, listSequenceOptions } from "@/lib/queries/sequences";
import { renderTemplate, type TemplateContext } from "@/lib/template-render";

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function getSequenceDetailAction(id: string) {
  return getSequenceDetail(id);
}

export async function listSequenceOptionsAction() {
  return listSequenceOptions();
}

const sequenceSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  description: z.string().trim().nullable().optional(),
});

export type SequenceInput = z.infer<typeof sequenceSchema>;

export async function createSequenceAction(input: SequenceInput) {
  const parsed = sequenceSchema.parse(input);
  const prisma = getPrisma();

  const sequence = await prisma.sequence.create({
    data: { name: parsed.name, description: parsed.description || null },
  });

  revalidatePath("/sequences");
  return sequence.id;
}

export async function updateSequenceAction(id: string, input: SequenceInput) {
  const parsed = sequenceSchema.parse(input);
  const prisma = getPrisma();

  await prisma.sequence.update({
    where: { id },
    data: { name: parsed.name, description: parsed.description || null },
  });

  revalidatePath("/sequences");
  return id;
}

export async function toggleSequenceActiveAction(id: string, isActive: boolean) {
  const prisma = getPrisma();
  await prisma.sequence.update({ where: { id }, data: { isActive } });
  revalidatePath("/sequences");
}

export async function deleteSequenceAction(id: string) {
  const prisma = getPrisma();
  await prisma.sequence.delete({ where: { id } });
  revalidatePath("/sequences");
}

const stepSchema = z.object({
  sequenceId: z.string().min(1),
  order: z.number().int().min(1),
  delayDays: z.number().int().min(0),
  action: z.enum(SequenceStepAction),
  emailSource: z.enum(SequenceStepEmailSource).optional(),
  templateId: z.string().min(1).nullable().optional(),
  emailSubject: z.string().trim().nullable().optional(),
  emailBody: z.string().trim().nullable().optional(),
  taskSubject: z.string().trim().nullable().optional(),
  taskType: z.enum(TaskType).nullable().optional(),
  taskReason: z.string().trim().nullable().optional(),
});

export type SequenceStepInput = z.infer<typeof stepSchema>;

function toStepData(parsed: SequenceStepInput) {
  const isCustomEmail = parsed.action === "SEND_EMAIL" && parsed.emailSource === "CUSTOM";
  return {
    order: parsed.order,
    delayDays: parsed.delayDays,
    action: parsed.action,
    emailSource: parsed.action === "SEND_EMAIL" ? (parsed.emailSource ?? "TEMPLATE") : "TEMPLATE",
    templateId: parsed.action === "SEND_EMAIL" && !isCustomEmail ? parsed.templateId || null : null,
    emailSubject: isCustomEmail ? parsed.emailSubject || null : null,
    emailBody: isCustomEmail ? parsed.emailBody || null : null,
    taskSubject: parsed.action === "CREATE_TASK" ? parsed.taskSubject || null : null,
    taskType: parsed.action === "CREATE_TASK" ? (parsed.taskType ?? null) : null,
    taskReason: parsed.action === "CREATE_TASK" ? parsed.taskReason || null : null,
  } as const;
}

export async function createSequenceStepAction(input: SequenceStepInput) {
  const parsed = stepSchema.parse(input);
  const prisma = getPrisma();

  const step = await prisma.sequenceStep.create({
    data: { sequenceId: parsed.sequenceId, ...toStepData(parsed) },
  });

  revalidatePath("/sequences");
  return step.id;
}

export async function updateSequenceStepAction(id: string, input: SequenceStepInput) {
  const parsed = stepSchema.parse(input);
  const prisma = getPrisma();

  await prisma.sequenceStep.update({
    where: { id },
    data: toStepData(parsed),
  });

  revalidatePath("/sequences");
  return id;
}

export async function deleteSequenceStepAction(id: string) {
  const prisma = getPrisma();
  await prisma.sequenceStep.delete({ where: { id } });
  revalidatePath("/sequences");
}

/**
 * Enrolls contacts in a sequence — used both by the single-contact "enroll"
 * dialog in the sequence detail view, the company drawer's "Inscrire à une
 * séquence" action, and the bulk "Ajouter à une séquence" action from the
 * Contacts table. Contacts already enrolled are silently skipped rather
 * than failing the whole batch. Logs an Activity per newly-enrolled
 * contact so it shows up in the company/contact timeline.
 */
export async function enrollContactsInSequenceAction(sequenceId: string, contactIds: string[]) {
  const prisma = getPrisma();
  const [sequence, firstStep, existingEnrollments, ownerId] = await Promise.all([
    prisma.sequence.findUniqueOrThrow({ where: { id: sequenceId } }),
    prisma.sequenceStep.findFirst({ where: { sequenceId }, orderBy: { order: "asc" } }),
    prisma.sequenceEnrollment.findMany({
      where: { sequenceId, contactId: { in: contactIds } },
      select: { contactId: true },
    }),
    getCurrentUserId(),
  ]);
  if (!firstStep) {
    throw new Error("Cette séquence n'a aucune étape — ajoute au moins une étape avant d'inscrire des contacts.");
  }

  const alreadyEnrolledIds = new Set(existingEnrollments.map((e) => e.contactId));
  const newContactIds = contactIds.filter((id) => !alreadyEnrolledIds.has(id));
  if (newContactIds.length === 0) return 0;

  const nextStepDueAt = addDays(new Date(), firstStep.delayDays);
  const [result, contacts] = await Promise.all([
    prisma.sequenceEnrollment.createMany({
      data: newContactIds.map((contactId) => ({
        sequenceId,
        contactId,
        currentStepOrder: firstStep.order,
        nextStepDueAt,
      })),
      skipDuplicates: true,
    }),
    prisma.contact.findMany({
      where: { id: { in: newContactIds } },
      select: { id: true, companyId: true },
    }),
  ]);

  await prisma.activity.createMany({
    data: contacts.map((contact) => ({
      type: "AUTRE",
      subject: `Inscrit à la séquence « ${sequence.name} »`,
      contactId: contact.id,
      companyId: contact.companyId,
      ownerId: ownerId ?? undefined,
      completedAt: new Date(),
    })),
  });

  revalidatePath("/sequences");
  revalidatePath("/contacts");
  revalidatePath("/companies");
  return result.count;
}

export async function unenrollContactAction(enrollmentId: string) {
  const prisma = getPrisma();
  await prisma.sequenceEnrollment.update({
    where: { id: enrollmentId },
    data: { status: "CANCELLED", nextStepDueAt: null },
  });
  revalidatePath("/sequences");
}

/**
 * Advances every ACTIVE enrollment whose next step is due: executes the
 * step (logs an EMAIL activity for SEND_EMAIL, creates a Task for
 * CREATE_TASK) and schedules the following step, or completes the
 * enrollment if there isn't one. There's no cron in this app — this is
 * called opportunistically on every /sequences page load, plus an
 * explicit "Exécuter les étapes dues" button.
 */
export async function processDueSequenceStepsAction(): Promise<{ processed: number }> {
  const prisma = getPrisma();
  const now = new Date();
  const ownerId = await getCurrentUserId();

  const dueEnrollments = await prisma.sequenceEnrollment.findMany({
    where: { status: "ACTIVE", nextStepDueAt: { lte: now } },
    include: {
      sequence: { include: { steps: { orderBy: { order: "asc" } } } },
      contact: { include: { company: true } },
    },
  });

  let processed = 0;

  for (const enrollment of dueEnrollments) {
    const steps = enrollment.sequence.steps;
    const currentStep = steps.find((s) => s.order === enrollment.currentStepOrder);

    if (currentStep) {
      const context: TemplateContext = {
        contact: enrollment.contact,
        company: enrollment.contact.company,
      };

      if (currentStep.action === "SEND_EMAIL" && currentStep.emailSource === "CUSTOM") {
        if (currentStep.emailSubject || currentStep.emailBody) {
          await prisma.activity.create({
            data: {
              type: "EMAIL",
              subject: renderTemplate(currentStep.emailSubject || "", context),
              description: renderTemplate(currentStep.emailBody || "", context),
              contactId: enrollment.contactId,
              companyId: enrollment.contact.companyId,
              ownerId: ownerId ?? undefined,
              completedAt: now,
            },
          });
        }
      } else if (currentStep.action === "SEND_EMAIL" && currentStep.templateId) {
        const template = await prisma.emailTemplate.findUnique({
          where: { id: currentStep.templateId },
        });
        if (template) {
          await prisma.activity.create({
            data: {
              type: "EMAIL",
              subject: renderTemplate(template.subject, context),
              description: renderTemplate(template.body, context),
              contactId: enrollment.contactId,
              companyId: enrollment.contact.companyId,
              ownerId: ownerId ?? undefined,
              completedAt: now,
            },
          });
        }
      } else if (currentStep.action === "CREATE_TASK") {
        await prisma.task.create({
          data: {
            subject: renderTemplate(currentStep.taskSubject || "Relance", context),
            reason: currentStep.taskReason
              ? renderTemplate(currentStep.taskReason, context)
              : null,
            type: currentStep.taskType ?? "RELANCE_EMAIL",
            dueDate: now,
            contactId: enrollment.contactId,
            companyId: enrollment.contact.companyId,
            ownerId: ownerId ?? undefined,
          },
        });
      }
    }

    const nextStep = currentStep
      ? steps.find((s) => s.order > currentStep.order)
      : undefined;

    if (nextStep) {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStepOrder: nextStep.order,
          nextStepDueAt: addDays(now, nextStep.delayDays),
        },
      });
    } else {
      await prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "COMPLETED", completedAt: now, nextStepDueAt: null },
      });
    }

    processed++;
  }

  if (processed > 0) {
    revalidatePath("/sequences");
    revalidatePath("/tasks");
    revalidatePath("/companies");
    revalidatePath("/contacts");
  }

  return { processed };
}
