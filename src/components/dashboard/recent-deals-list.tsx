import Link from "next/link";

import type { RecentDeal } from "@/lib/queries/dashboard";
import { formatCurrency, formatDate } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";

export function RecentDealsList({ deals }: { deals: RecentDeal[] }) {
  if (deals.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Aucun deal pour le moment.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {deals.map((deal) => (
        <li key={deal.id}>
          <Link
            href="/deals"
            className="flex items-center justify-between gap-2 rounded-lg border p-2.5 text-sm transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{deal.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {deal.company.name} · {formatDate(deal.updatedAt)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant="outline">{deal.stage.name}</Badge>
              <span className="text-xs font-medium">{formatCurrency(deal.value)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
