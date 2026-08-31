"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { extractVariables } from "@/lib/template-render";
import { getPrisma } from "@/lib/prisma";
import { listEmailTemplateOptions } from "@/lib/queries/email-templates";

export async function listEmailTemplateOptionsAction() {
  return listEmailTemplateOptions();
}

const emailTemplateSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis."),
  subject: z.string().trim().min(1, "L'objet est requis."),
  body: z.string().trim().min(1, "Le contenu est requis."),
});

export type EmailTemplateInput = z.infer<typeof emailTemplateSchema>;

export async function createEmailTemplateAction(input: EmailTemplateInput) {
  const parsed = emailTemplateSchema.parse(input);
  const prisma = getPrisma();

  const template = await prisma.emailTemplate.create({
    data: {
      title: parsed.title,
      subject: parsed.subject,
      body: parsed.body,
      variables: extractVariables(`${parsed.subject} ${parsed.body}`),
    },
  });

  revalidatePath("/templates");
  return template.id;
}

export async function updateEmailTemplateAction(id: string, input: EmailTemplateInput) {
  const parsed = emailTemplateSchema.parse(input);
  const prisma = getPrisma();

  await prisma.emailTemplate.update({
    where: { id },
    data: {
      title: parsed.title,
      subject: parsed.subject,
      body: parsed.body,
      variables: extractVariables(`${parsed.subject} ${parsed.body}`),
    },
  });

  revalidatePath("/templates");
  return id;
}

export async function deleteEmailTemplateAction(id: string) {
  const prisma = getPrisma();
  await prisma.emailTemplate.delete({ where: { id } });

  revalidatePath("/templates");
}
