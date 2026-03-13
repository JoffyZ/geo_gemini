import { NextResponse } from 'next/server'
import { db } from '@/db'
import { monitoringLogs } from '@/db/schema'
import { sql, count, avg, eq } from 'drizzle-orm'
import { getTenantId } from '@/lib/auth'

/**
 * GET /api/monitoring/stats:
 * 按 country_code 和 ai_platform 分组统计监测任务的执行情况。
 */
export async function GET() {
  const tenantId = await getTenantId()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 按 countryCode 和 aiPlatform 分组统计
    const stats = await db
      .select({
        countryCode: monitoringLogs.countryCode,
        aiPlatform: monitoringLogs.aiPlatform,
        totalTasks: count(),
        successCount: sql<number>`count(case when ${monitoringLogs.status} = 'success' then 1 end)`,
        failureCount: sql<number>`count(case when ${monitoringLogs.status} = 'failed' then 1 end)`,
        avgDurationMs: avg(monitoringLogs.durationMs),
      })
      .from(monitoringLogs)
      .where(eq(monitoringLogs.tenantId, tenantId))
      .groupBy(monitoringLogs.countryCode, monitoringLogs.aiPlatform)

    const formattedStats = stats.map((s) => {
      const total = Number(s.totalTasks)
      const success = Number(s.successCount)
      const failure = Number(s.failureCount)
      const successRate = total > 0 ? (success / total) * 100 : 0

      return {
        countryCode: s.countryCode,
        aiPlatform: s.aiPlatform,
        totalTasks: total,
        successCount: success,
        failureCount: failure,
        successRate: Number(successRate.toFixed(2)),
        avgDurationMs: s.avgDurationMs ? Number(Number(s.avgDurationMs).toFixed(2)) : 0,
      }
    })

    return NextResponse.json(formattedStats)
  } catch (error) {
    console.error('Failed to fetch monitoring stats:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
