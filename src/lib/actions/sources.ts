'use server';

import { db } from '@/db';
import { monitoringResults, prompts } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { classifyDomain, extractDomain, DomainCategory } from '@/lib/classification/domain-classifier';
import { MonitoringResultSchema } from '@/lib/parser';

export interface SourceMetric {
  domain: string;
  category: DomainCategory;
  count: number;
}

export interface CategoryData {
  name: string;
  value: number;
  color?: string;
}

export interface SourceStats {
  topSources: SourceMetric[];
  categoryDistribution: CategoryData[];
  totalCitations: number;
}

const CATEGORY_COLORS: Record<DomainCategory, string> = {
  Media: '#3b82f6', // blue-500
  Social: '#ec4899', // pink-500
  Forum: '#f59e0b', // amber-500
  Blog: '#10b981', // emerald-500
  Corporate: '#6366f1', // indigo-500
  Academic: '#8b5cf6', // violet-500
  Government: '#64748b', // slate-500
  Other: '#94a3b8', // slate-400
};

export async function getSourceAnalysis(filters: {
  tenantId: string;
  aiPlatform?: string;
  countryCode?: string;
  categoryId?: string;
}): Promise<SourceStats> {
  // 1. Fetch relevant results
  const conditions = [eq(monitoringResults.tenantId, filters.tenantId)];

  if (filters.aiPlatform && filters.aiPlatform !== 'all') {
    conditions.push(eq(monitoringResults.aiPlatform, filters.aiPlatform as any));
  }
  if (filters.countryCode && filters.countryCode !== 'all') {
    conditions.push(eq(monitoringResults.countryCode, filters.countryCode));
  }

  // Join with prompts to filter by category if categoryId is provided
  let query;
  if (filters.categoryId && filters.categoryId !== 'all') {
    query = db
      .select({
        content: monitoringResults.content,
      })
      .from(monitoringResults)
      .innerJoin(prompts, eq(monitoringResults.promptId, prompts.id))
      .where(and(...conditions, eq(prompts.categoryId, filters.categoryId)));
  } else {
    query = db
      .select({
        content: monitoringResults.content,
      })
      .from(monitoringResults)
      .where(and(...conditions));
  }

  const results = await query;

  const domainCounts: Record<string, number> = {};
  let totalCitations = 0;

  // 2. Extract and count domains
  for (const row of results) {
    try {
      // row.content is already an object because of jsonb
      const parsed = MonitoringResultSchema.parse(row.content);
      for (const citation of parsed.citations) {
        const domain = extractDomain(citation.domain || citation.url);
        domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        totalCitations++;
      }
    } catch (e) {
      // console.error('Failed to parse content for citation analysis', e);
    }
  }

  // 3. Classify and aggregate
  const domainList = Object.keys(domainCounts);
  const categoryCounts: Record<DomainCategory, number> = {
    Media: 0,
    Social: 0,
    Forum: 0,
    Blog: 0,
    Corporate: 0,
    Academic: 0,
    Government: 0,
    Other: 0,
  };

  // Classify in parallel (batch size of 5 to avoid overloading/rate limits)
  const sourceMetrics: SourceMetric[] = [];
  const BATCH_SIZE = 10;
  for (let i = 0; i < domainList.length; i += BATCH_SIZE) {
    const batch = domainList.slice(i, i + BATCH_SIZE);
    const classifications = await Promise.all(
      batch.map(async (domain) => {
        const category = await classifyDomain(domain);
        return { domain, category, count: domainCounts[domain] };
      })
    );

    for (const m of classifications) {
      sourceMetrics.push(m);
      categoryCounts[m.category] += m.count;
    }
  }

  // Sort by count
  sourceMetrics.sort((a, b) => b.count - a.count);

  const categoryDistribution: CategoryData[] = Object.entries(categoryCounts)
    .filter(([_, count]) => count > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name as DomainCategory],
    }))
    .sort((a, b) => b.value - a.value);

  return {
    topSources: sourceMetrics.slice(0, 50),
    categoryDistribution,
    totalCitations,
  };
}
