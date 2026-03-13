'use server';

import { db } from '@/db';
import { brandMetricsDaily, brands } from '@/db/schema';
import { getTenantId } from '@/lib/auth';
import { eq, and, gte, lte, inArray, sql, asc } from 'drizzle-orm';

export interface AnalyticsFilter {
  dateRange: { start: Date; end: Date };
  countries?: string[];
  categories?: string[];
  platforms?: string[];
}

/**
 * Retrieves aggregated metrics from the materialized view.
 * Ensures tenant isolation.
 */
export async function getDashboardMetrics(filter: AnalyticsFilter) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Unauthorized');

  const conditions = [
    eq(brandMetricsDaily.tenantId, tenantId),
    gte(brandMetricsDaily.day, filter.dateRange.start),
    lte(brandMetricsDaily.day, filter.dateRange.end),
  ];

  if (filter.countries?.length) {
    conditions.push(inArray(brandMetricsDaily.countryCode, filter.countries));
  }
  if (filter.categories?.length) {
    conditions.push(inArray(brandMetricsDaily.categoryId, filter.categories));
  }
  if (filter.platforms?.length) {
    conditions.push(inArray(brandMetricsDaily.aiPlatform, filter.platforms as any));
  }

  return db.select({
    day: brandMetricsDaily.day,
    brandId: brandMetricsDaily.brandId,
    brandName: brands.name,
    mentionCount: brandMetricsDaily.mentionCount,
    totalResults: brandMetricsDaily.totalResults,
    rankSum: brandMetricsDaily.rankSum,
    avgRank: brandMetricsDaily.avgRank,
    shareOfVoice: brandMetricsDaily.shareOfVoice,
    aiPlatform: brandMetricsDaily.aiPlatform,
    countryCode: brandMetricsDaily.countryCode,
  })
  .from(brandMetricsDaily)
  .innerJoin(brands, eq(brandMetricsDaily.brandId, brands.id))
  .where(and(...conditions))
  .orderBy(asc(brandMetricsDaily.day));
}

/**
 * Returns trend data formatted for Recharts.
 * Pivot: [{ date: '2024-01-01', 'Brand A': 45, 'Brand B': 30 }, ...]
 */
export async function getTrendData(filter: AnalyticsFilter) {
  const rows = await getDashboardMetrics(filter);
  
  const dataMap = new Map<string, any>();

  rows.forEach(row => {
    const dateStr = row.day.toISOString().split('T')[0];
    if (!dataMap.has(dateStr)) {
      dataMap.set(dateStr, { date: dateStr });
    }
    const dayData = dataMap.get(dateStr);
    
    const name = row.brandName;
    if (!dayData[name]) {
      dayData[name] = 0;
      dayData[`${name}_total`] = 0;
      dayData[`${name}_rank_sum`] = 0;
      dayData[`${name}_rank_count`] = 0;
    }
    
    dayData[name] += row.mentionCount;
    dayData[`${name}_total`] += row.totalResults;
    dayData[`${name}_rank_sum`] += row.rankSum;
    dayData[`${name}_rank_count`] += row.mentionCount;
  });

  const trendData = Array.from(dataMap.values()).map(dayData => {
    const final: any = { date: dayData.date };
    Object.keys(dayData).forEach(key => {
      // If it's a brand name (not date and not a suffix)
      if (key !== 'date' && !key.endsWith('_total') && !key.endsWith('_rank_sum') && !key.endsWith('_rank_count')) {
        const total = dayData[`${key}_total`];
        final[key] = total > 0 ? Number(((dayData[key] / total) * 100).toFixed(2)) : 0;
        
        const rankCount = dayData[`${key}_rank_count`];
        final[`${key}_rank`] = rankCount > 0 ? Number((dayData[`${key}_rank_sum`] / rankCount).toFixed(2)) : null;
      }
    });
    return final;
  });

  return trendData.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Returns core KPI summary with comparison to the previous period.
 */
export async function getKPISummary(filter: AnalyticsFilter) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error('Unauthorized');

  const duration = filter.dateRange.end.getTime() - filter.dateRange.start.getTime();
  const prevRange = {
    start: new Date(filter.dateRange.start.getTime() - duration - 86400000),
    end: new Date(filter.dateRange.end.getTime() - duration - 86400000),
  };

  const getAggregated = async (start: Date, end: Date) => {
    const conditions = [
      eq(brandMetricsDaily.tenantId, tenantId),
      gte(brandMetricsDaily.day, start),
      lte(brandMetricsDaily.day, end),
    ];
    if (filter.countries?.length) conditions.push(inArray(brandMetricsDaily.countryCode, filter.countries));
    if (filter.categories?.length) conditions.push(inArray(brandMetricsDaily.categoryId, filter.categories));
    if (filter.platforms?.length) conditions.push(inArray(brandMetricsDaily.aiPlatform, filter.platforms as any));

    return db.select({
      totalMentions: sql<number>`sum(${brandMetricsDaily.mentionCount})`,
      totalRankSum: sql<number>`sum(${brandMetricsDaily.rankSum})`,
      totalQueries: sql<number>`sum(${brandMetricsDaily.totalResults})`,
    })
    .from(brandMetricsDaily)
    .where(and(...conditions));
  };

  const [current, previous] = await Promise.all([
    getAggregated(filter.dateRange.start, filter.dateRange.end),
    getAggregated(prevRange.start, prevRange.end),
  ]);

  const curr = current[0] || { totalMentions: 0, totalRankSum: 0, totalQueries: 0 };
  const prev = previous[0] || { totalMentions: 0, totalRankSum: 0, totalQueries: 0 };

  const totalMentions = Number(curr.totalMentions || 0);
  const prevMentions = Number(prev.totalMentions || 0);
  const mentionChange = prevMentions === 0 ? 0 : ((totalMentions - prevMentions) / prevMentions) * 100;

  const avgRank = totalMentions > 0 ? Number(curr.totalRankSum || 0) / totalMentions : 0;
  const prevAvgRank = prevMentions > 0 ? Number(prev.totalRankSum || 0) / prevMentions : 0;
  const avgRankChange = avgRank - prevAvgRank;

  const avgSOV = curr.totalQueries > 0 ? (totalMentions / Number(curr.totalQueries)) * 100 : 0;
  const prevSOV = prev.totalQueries > 0 ? (prevMentions / Number(prev.totalQueries)) * 100 : 0;
  const sovChange = prevSOV === 0 ? 0 : ((avgSOV - prevSOV) / prevSOV) * 100;

  return {
    totalMentions,
    mentionChange: Number(mentionChange.toFixed(2)),
    avgRank: Number(avgRank.toFixed(2)),
    avgRankChange: Number(avgRankChange.toFixed(2)),
    avgSOV: Number(avgSOV.toFixed(2)),
    sovChange: Number(sovChange.toFixed(2)),
  };
}
