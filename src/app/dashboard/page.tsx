import { getKPISummary, getTrendData } from '@/lib/actions/analytics';
import { getSourceAnalysis } from '@/lib/actions/sources';
import { DashboardFilters } from '@/components/dashboard/dashboard-filters';
import { KPICards } from '@/components/dashboard/kpi-cards';
import { TrendCharts } from '@/components/dashboard/trend-charts';
import { SourceAnalysis } from '@/components/analytics/source-analysis';
import { db } from '@/db';
import { categories, brandMetricsDaily } from '@/db/schema';
import { getTenantId } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DashboardPageProps {
  searchParams: Promise<{
    start?: string;
    end?: string;
    category?: string;
    platform?: string;
    country?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const tenantId = await getTenantId();
  if (!tenantId) return <div>Unauthorized</div>;

  // Default date range: last 30 days
  const endDate = params.end ? new Date(params.end) : new Date();
  const startDate = params.start ? new Date(params.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const filter = {
    dateRange: { start: startDate, end: endDate },
    categories: params.category && params.category !== 'all' ? [params.category] : undefined,
    platforms: params.platform && params.platform !== 'all' ? [params.platform] : undefined,
    countries: params.country && params.country !== 'all' ? [params.country] : undefined,
  };

  // Parallel data fetching for summary, trends, and sources
  const [summary, trendData, sourceData, filterOptions] = await Promise.all([
    getKPISummary(filter),
    getTrendData(filter),
    getSourceAnalysis({ 
      tenantId, 
      aiPlatform: params.platform, 
      countryCode: params.country, 
      categoryId: params.category 
    }),
    getFilterOptions(tenantId),
  ]);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <DashboardFilters 
        categories={filterOptions.categories}
        countries={filterOptions.countries}
        platforms={filterOptions.platforms}
      />

      <div className="space-y-4">
        <KPICards data={summary} />
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">趋势概览</TabsTrigger>
            <TabsTrigger value="sources">引用来源分析</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
              <TrendCharts data={trendData} />
            </Suspense>
          </TabsContent>
          <TabsContent value="sources" className="space-y-4">
            <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
              <SourceAnalysis data={sourceData} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

async function getFilterOptions(tenantId: string) {
  const [catList, countryList, platformList] = await Promise.all([
    db.select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.tenantId, tenantId)),
    
    db.select({ country: brandMetricsDaily.countryCode })
      .from(brandMetricsDaily)
      .where(eq(brandMetricsDaily.tenantId, tenantId))
      .groupBy(brandMetricsDaily.countryCode),

    db.select({ platform: brandMetricsDaily.aiPlatform })
      .from(brandMetricsDaily)
      .where(eq(brandMetricsDaily.tenantId, tenantId))
      .groupBy(brandMetricsDaily.aiPlatform),
  ]);

  return {
    categories: catList,
    countries: countryList.map(c => c.country),
    platforms: platformList.map(p => p.platform),
  };
}
