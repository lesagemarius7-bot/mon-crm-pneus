-- CreateEnum
CREATE TYPE "SequenceStepAction" AS ENUM ('SEND_EMAIL', 'CREATE_TASK');

-- CreateEnum
CREATE TYPE "SequenceEnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContactListType" AS ENUM ('STATIC', 'DYNAMIC');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('DEAL_WON', 'DEAL_LOST');

-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('CREATE_TASK', 'SEND_EMAIL_TEMPLATE');

-- CreateTable
CREATE TABLE "email_templates" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequences" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_steps" (
    "id" UUID NOT NULL,
    "sequenceId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "action" "SequenceStepAction" NOT NULL,
    "templateId" UUID,
    "taskSubject" TEXT,
    "taskType" "TaskType",
    "taskReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequence_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequence_enrollments" (
    "id" UUID NOT NULL,
    "sequenceId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "status" "SequenceEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentStepOrder" INTEGER NOT NULL DEFAULT 0,
    "nextStepDueAt" TIMESTAMP(3),
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "sequence_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_lists" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ContactListType" NOT NULL DEFAULT 'STATIC',
    "filters" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_list_memberships" (
    "id" UUID NOT NULL,
    "listId" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_list_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "trigger" "AutomationTrigger" NOT NULL,
    "actionType" "AutomationActionType" NOT NULL,
    "templateId" UUID,
    "taskSubject" TEXT,
    "taskType" "TaskType",
    "taskReason" TEXT,
    "delayDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sequence_steps_sequenceId_order_key" ON "sequence_steps"("sequenceId", "order");

-- CreateIndex
CREATE INDEX "sequence_steps_sequenceId_idx" ON "sequence_steps"("sequenceId");

-- CreateIndex
CREATE UNIQUE INDEX "sequence_enrollments_sequenceId_contactId_key" ON "sequence_enrollments"("sequenceId", "contactId");

-- CreateIndex
CREATE INDEX "sequence_enrollments_sequenceId_idx" ON "sequence_enrollments"("sequenceId");

-- CreateIndex
CREATE INDEX "sequence_enrollments_contactId_idx" ON "sequence_enrollments"("contactId");

-- CreateIndex
CREATE INDEX "sequence_enrollments_nextStepDueAt_idx" ON "sequence_enrollments"("nextStepDueAt");

-- CreateIndex
CREATE UNIQUE INDEX "contact_list_memberships_listId_contactId_key" ON "contact_list_memberships"("listId", "contactId");

-- CreateIndex
CREATE INDEX "contact_list_memberships_listId_idx" ON "contact_list_memberships"("listId");

-- CreateIndex
CREATE INDEX "contact_list_memberships_contactId_idx" ON "contact_list_memberships"("contactId");

-- AddForeignKey
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_steps" ADD CONSTRAINT "sequence_steps_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_enrollments" ADD CONSTRAINT "sequence_enrollments_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "sequences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sequence_enrollments" ADD CONSTRAINT "sequence_enrollments_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_list_memberships" ADD CONSTRAINT "contact_list_memberships_listId_fkey" FOREIGN KEY ("listId") REFERENCES "contact_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_list_memberships" ADD CONSTRAINT "contact_list_memberships_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
