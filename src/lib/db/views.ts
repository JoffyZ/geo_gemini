import { sql } from 'drizzle-orm';

/**
 * SQL logic for the brand_metrics_daily materialized view.
 * This view aggregates monitoring results by day, tenant, brand, category, country, and platform.
 * 
 * Note: This SQL should be executed in the database (e.g., via Supabase SQL Editor or a migration).
 */
export const brandMetricsDailySQL = `
CREATE MATERIALIZED VIEW IF NOT EXISTS brand_metrics_daily AS
WITH expanded AS (
  SELECT
    mr.tenant_id,
    mr.ai_platform,
    mr.country_code,
    date_trunc('day', mr.created_at) as day,
    p.category_id,
    (b_elem->>'name')::text as brand_name,
    (b_elem->>'rank')::integer as rank
  FROM
    monitoring_results mr
  JOIN
    prompts p ON mr.prompt_id = p.id
  CROSS JOIN LATERAL
    jsonb_array_elements(mr.content->'brands') AS b_elem
),
brand_mentions AS (
  SELECT
    tenant_id,
    brand_name,
    category_id,
    country_code,
    ai_platform,
    day,
    count(*) as mention_count,
    sum(rank) as rank_sum,
    avg(rank) as avg_rank
  FROM
    expanded
  GROUP BY
    tenant_id, brand_name, category_id, country_code, ai_platform, day
),
daily_totals AS (
  SELECT
    mr.tenant_id,
    p.category_id,
    mr.country_code,
    mr.ai_platform,
    date_trunc('day', mr.created_at) as day,
    count(*) as total_results
  FROM
    monitoring_results mr
  JOIN
    prompts p ON mr.prompt_id = p.id
  GROUP BY
    mr.tenant_id, p.category_id, mr.country_code, mr.ai_platform, day
)
SELECT
  bm.tenant_id,
  b.id as brand_id,
  bm.category_id,
  bm.country_code,
  bm.ai_platform,
  bm.day,
  bm.mention_count,
  dt.total_results,
  bm.rank_sum,
  bm.avg_rank::numeric(10,2) as avg_rank,
  (bm.mention_count::float / dt.total_results::float)::numeric(10,4) as share_of_voice,
  now() as last_refreshed_at
FROM
  brand_mentions bm
JOIN
  brands b ON LOWER(bm.brand_name) = LOWER(b.name) AND bm.tenant_id = b.tenant_id
JOIN
  daily_totals dt ON
    bm.tenant_id = dt.tenant_id AND
    bm.category_id = dt.category_id AND
    bm.country_code = dt.country_code AND
    bm.ai_platform = dt.ai_platform AND
    bm.day = dt.day;

CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_metrics_daily_unique 
ON brand_metrics_daily (tenant_id, brand_id, category_id, country_code, ai_platform, day);
`;

/**
 * Refreshes the brand_metrics_daily materialized view.
 * Uses CONCURRENTLY to avoid locking the view for reads.
 * Requires a unique index on the view.
 */
export async function refreshBrandMetricsDaily(db: any) {
  await db.execute(sql`REFRESH MATERIALIZED VIEW CONCURRENTLY brand_metrics_daily`);
}
