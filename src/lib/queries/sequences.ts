import "server-only";

import { getPrisma } from "@/lib/prisma";

export async function listSequences() {
  const prisma = getPrisma();
  const sequences = await prisma.sequence.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          steps: true,
          enrollments: { where: { status: "ACTIVE" } },
        },
      },
    },
  });
  return sequences;
}

export type SequenceRow = Awaited<ReturnType<typeof listSequences>>[number];

export async function getSequenceDetail(id: string) {
  const prisma = getPrisma();
  const sequence = await prisma.sequence.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { order: "asc" }, include: { template: true } },
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        include: {
          contact: { include: { company: { select: { id: true, name: true } } } },
        },
      },
    },
  });
  return sequence;
}

export type SequenceDetail = NonNullable<Awaited<ReturnType<typeof getSequenceDetail>>>;

/** Lightweight list for pickers (bulk "add to sequence" from Contacts). */
export async function listSequenceOptions() {
  const prisma = getPrisma();
  return prisma.sequence.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export type SequenceOption = Awaited<ReturnType<typeof listSequenceOptions>>[number];
