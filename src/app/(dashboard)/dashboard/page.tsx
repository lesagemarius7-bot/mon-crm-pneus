import {
  AlertCircle,
  CheckSquare,
  Euro,
  Mail,
  TrendingUp,
  Workflow,
} from "lucide-react";

import { getDashboardData } from "@/lib/queries/dashboard";
import { formatCurrency } from "@/lib/labels";
import { ActivityTrendChart } from "@/components/dashboard/activity-trend-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PipelineByStageChart } from "@/components/dashboard/pipeline-by-stage-chart";
import { PriorityTasksList } from "@/components/dashboard/priority-tasks-list";
import { RecentDealsList } from "@/components/dashboard/recent-deals-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const data = await getDashboardData();

  const conversionLabel =
    data.conversionRate === null ? "—" : `${data.conversionRate.toFixed(0)} %`;

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b px-4 py-3">
        <h1 className="font-semibold">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">
          Vue d&apos;ensemble de l&apos;activité commerciale.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            icon={Euro}
            label="CA signé ce mois-ci"
            value={formatCurrency(data.revenueThisMonth)}
            subValue={`${formatCurrency(data.revenueAllTime)} au total`}
          />
          <KpiCard
            icon={TrendingUp}
            label="Pipeline en cours"
            value={formatCurrency(data.pipelineValue)}
            subValue="Deals non fermés"
          />
          <KpiCard
            icon={Workflow}
            label="Taux de conversion"
            value={conversionLabel}
            subValue={`${data.wonCount} / ${data.closedCount} deals fermés`}
          />
          <KpiCard
            icon={CheckSquare}
            label="Tâches du jour"
            value={String(data.todayTaskCount)}
            subValue={
              data.overdueTaskCount > 0
                ? `${data.overdueTaskCount} en retard`
                : "Aucune en retard"
            }
            accent={data.overdueTaskCount > 0}
          />
          <KpiCard
            icon={Mail}
            label="Emails & séquences"
            value={String(data.emailActivityCount)}
            subValue={`${data.activeEnrollmentCount} contact${data.activeEnrollmentCount > 1 ? "s" : ""} en séquence active`}
          />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pipeline par étape</CardTitle>
            </CardHeader>
            <CardContent>
              <PipelineByStageChart
                data={data.dealsByStage.map(({ stage, total, count }) => ({
                  name: stage.name,
                  total,
                  count,
                  isWon: stage.isWon,
                  isLost: stage.isLost,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Activité — emails &amp; tâches (30 derniers jours)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTrendChart data={data.activityTrend} />
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CheckSquare className="size-4 text-primary" />
                Mes tâches prioritaires du jour
                {data.overdueTaskCount > 0 && (
                  <span className="ml-auto flex items-center gap-1 text-xs font-normal text-destructive">
                    <AlertCircle className="size-3.5" />
                    {data.overdueTaskCount} en retard
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PriorityTasksList tasks={data.priorityTasks} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Derniers deals ajoutés / modifiés</CardTitle>
            </CardHeader>
            <CardContent>
              <RecentDealsList deals={data.recentDeals} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
