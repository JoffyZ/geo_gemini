import { Worker, Job } from 'bullmq'
import { ioredisConnection } from '../redis'
import { db } from '@/db'
import { monitoringLogs, monitoringResults } from '@/db/schema'
import { AdapterFactory } from '@/lib/adapters/factory'
import { parseAIResponse } from '@/lib/parser'
import { eq } from 'drizzle-orm'

/**
 * Main monitoring worker that processes AI query and parsing.
 */
export const monitoringWorker = new Worker(
  'monitoring-queue',
  async (job: Job) => {
    const { promptId, tenantId, countryCode, platform } = job.data
    const startTime = Date.now()

    // 1. Create a log entry
    const [log] = await db.insert(monitoringLogs).values({
      tenantId,
      promptId,
      aiPlatform: platform,
      countryCode,
      status: 'pending',
    }).returning()

    try {
      // 2. Execute AI Query
      const adapter = AdapterFactory.getAdapter(platform)
      
      // Get prompt content
      const [promptData] = await db.query.prompts.findMany({
        where: (prompts, { eq }) => eq(prompts.id, promptId),
        limit: 1
      })

      if (!promptData) throw new Error('Prompt not found')

      const { rawResponse } = await adapter.query(promptData.content, countryCode)

      // 3. Parse Result
      const structuredData = await parseAIResponse(rawResponse, countryCode)

      // 4. Save Result
      await db.insert(monitoringResults).values({
        tenantId,
        promptId,
        logId: log.id,
        aiPlatform: platform,
        countryCode,
        content: structuredData,
        rawResponse,
      })

      // 5. Update Log to Success
      await db.update(monitoringLogs)
        .set({
          status: 'success',
          durationMs: Date.now() - startTime,
        })
        .where(eq(monitoringLogs.id, log.id))

      return { success: true }
    } catch (error: any) {
      console.error(`[Worker] Job ${job.id} failed:`, error)

      // Update Log to Failed
      await db.update(monitoringLogs)
        .set({
          status: 'failed',
          errorMessage: error.message,
          errorStack: error.stack,
          durationMs: Date.now() - startTime,
        })
        .where(eq(monitoringLogs.id, log.id))

      throw error // Re-throw to trigger BullMQ retry
    }
  },
  {
    connection: ioredisConnection as any,
    concurrency: 5,
    settings: {
      backoffStrategy: (attempts: number, type: string | undefined) => {
        if (type === 'adaptive') {
          return Math.pow(2, attempts) * 2000
        }
        return 1000
      },
    }
  }
)

monitoringWorker.on('completed', (job: Job) => {
  console.log(`[Worker] Job ${job.id} (${job.name}) completed!`)
})

monitoringWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`[Worker] Job ${job?.id ?? 'unknown'} failed with ${err.message}`)
})
