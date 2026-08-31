import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_DAYS = 30;
const PRIORITY_RANK: Record<string, number> = { HAUTE: 0, NORMALE: 1, BASSE: 2 };

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getDashboardData() {
  const prisma = getPrisma();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = startOfDay(now);
  const todayEnd = new Date(todayStart.getTime() + DAY_MS);
  const trendStart = new Date(todayStart.getTime() - (TREND_DAYS - 1) * DAY_MS);

  const [
    stages,
    deals,
    todayTasks,
    overdueTaskCount,
    emailActivityCount,
    activeEnrollmentCount,
    recentDeals,
    recentEmails,
    recentCompletedTasks,
  ] = await Promise.all([
    prisma.pipelineStage.findMany({ orderBy: { order: "asc" } }),
    prisma.deal.findMany({
      select: {
        id: true,
        value: true,
        stageId: true,
        closedAt: true,
        stage: { select: { isWon: true, isLost: true } },
      },
    }),
    prisma.task.findMany({
      where: { dueDate: { gte: todayStart, lt: todayEnd }, status: "A_FAIRE" },
      include: {
        company: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.task.count({ where: { dueDate: { lt: todayStart }, status: "A_FAIRE" } }),
    prisma.activity.count({ where: { type: "EMAIL" } }),
    prisma.sequenceEnrollment.count({
      where: { status: "ACTIVE", sequence: { isActive: true } },
    }),
    prisma.deal.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { company: { select: { id: true, name: true } }, stage: true },
    }),
    prisma.activity.findMany({
      where: { type: "EMAIL", createdAt: { gte: trendStart } },
      select: { createdAt: true },
    }),
    prisma.task.findMany({
      where: { status: "TERMINEE", completedAt: { gte: trendStart } },
      select: { completedAt: true },
    }),
  ]);

  const wonDeals = deals.filter((d) => d.stage.isWon);
  const lostDeals = deals.filter((d) => d.stage.isLost);
  const openDeals = deals.filter((d) => !d.stage.isWon && !d.stage.isLost);
  const wonDealsThisMonth = wonDeals.filter(
    (d) => d.closedAt && d.closedAt >= startOfMonth
  );

  const sum = (rows: { value: Prisma.Decimal | null }[]) =>
    rows.reduce((total, row) => total + (row.value ? row.value.toNumber() : 0), 0);

  const revenueThisMonth = sum(wonDealsThisMonth);
  const revenueAllTime = sum(wonDeals);
  const pipelineValue = sum(openDeals);
  const closedCount = wonDeals.length + lostDeals.length;
  const conversionRate = closedCount > 0 ? (wonDeals.length / closedCount) * 100 : null;

  const dealsByStage = stages.map((stage) => ({
    stage,
    total: sum(deals.filter((d) => d.stageId === stage.id)),
    count: deals.filter((d) => d.stageId === stage.id).length,
  }));

  const sortedTodayTasks = [...todayTasks].sort((a, b) => {
    const rankDiff = (PRIORITY_RANK[a.priority] ?? 1) - (PRIORITY_RANK[b.priority] ?? 1);
    if (rankDiff !== 0) return rankDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const trendMap = new Map<string, { emails: number; tasks: number }>();
  for (let i = 0; i < TREND_DAYS; i++) {
    const day = new Date(trendStart.getTime() + i * DAY_MS);
    trendMap.set(dateKey(day), { emails: 0, tasks: 0 });
  }
  for (const activity of recentEmails) {
    const key = dateKey(startOfDay(activity.createdAt));
    const bucket = trendMap.get(key);
    if (bucket) bucket.emails += 1;
  }
  for (const task of recentCompletedTasks) {
    if (!task.completedAt) continue;
    const key = dateKey(startOfDay(task.completedAt));
    const bucket = trendMap.get(key);
    if (bucket) bucket.tasks += 1;
  }
  const activityTrend = Array.from(trendMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }));

  return {
    revenueThisMonth,
    revenueAllTime,
    pipelineValue,
    conversionRate,
    wonCount: wonDeals.length,
    closedCount,
    todayTaskCount: sortedTodayTasks.length,
    overdueTaskCount,
    priorityTasks: sortedTodayTasks.slice(0, 5),
    emailActivityCount,
    activeEnrollmentCount,
    dealsByStage,
    activityTrend,
    recentDeals: recentDeals.map((deal) => ({
      ...deal,
      value: deal.value ? deal.value.toNumber() : null,
    })),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
export type PriorityTask = DashboardData["priorityTasks"][number];
export type RecentDeal = DashboardData["recentDeals"][number];
