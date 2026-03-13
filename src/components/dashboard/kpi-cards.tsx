import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownIcon, ArrowUpIcon, MessageSquareIcon, BarChart3Icon, TrophyIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  suffix?: string;
  inverse?: boolean; // If true, lower change is better (e.g. for Rank)
}

function KPICard({ title, value, change, icon, suffix = '', inverse = false }: KPICardProps) {
  const isPositive = change > 0;
  const isBetter = inverse ? !isPositive : isPositive;
  const isNeutral = change === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}{suffix}
        </div>
        <div className="flex items-center pt-1">
          {isNeutral ? (
            <span className="text-xs text-muted-foreground">No change</span>
          ) : (
            <>
              {isPositive ? (
                <ArrowUpIcon className={cn("h-4 w-4 mr-1", isBetter ? "text-green-500" : "text-red-500")} />
              ) : (
                <ArrowDownIcon className={cn("h-4 w-4 mr-1", isBetter ? "text-green-500" : "text-red-500")} />
              )}
              <span className={cn("text-xs font-medium", isBetter ? "text-green-500" : "text-red-500")}>
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">from prev period</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface KPICardsProps {
  data: {
    totalMentions: number;
    mentionChange: number;
    avgRank: number;
    avgRankChange: number;
    avgSOV: number;
    sovChange: number;
  };
}

export function KPICards({ data }: KPICardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <KPICard
        title="Total Mentions"
        value={data.totalMentions.toLocaleString()}
        change={data.mentionChange}
        icon={<MessageSquareIcon />}
      />
      <KPICard
        title="Avg Rank"
        value={data.avgRank === 0 ? 'N/A' : data.avgRank}
        change={data.avgRankChange}
        icon={<TrophyIcon />}
        inverse={true}
      />
      <KPICard
        title="Share of Voice"
        value={data.avgSOV}
        change={data.sovChange}
        icon={<BarChart3Icon />}
        suffix="%"
      />
    </div>
  );
}
