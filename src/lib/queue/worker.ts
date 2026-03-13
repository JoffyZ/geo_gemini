import { Worker, Job } from 'bullmq'
import { ioredisConnection } from '../redis'
import { db } from '@/db'
import { monitoringLogs, monitoringResults } from '@/db/schema'
import { AdapterFactory } from '@/lib/adapters/factory'
import { parseAIResponse } from '@/lib/parser'
import { eq } from 'drizzle-orm'

/**
 * BullMQ Monitoring Worker.
 * Listens for jobs in the 'monitoring-queue' and processes them.
 */
export const monitoringWorker = new Worker(
  'monitoring-queue',
  async (job: Job) => {
    const { logId, prompt, platform, countryCode, tenantId, promptId } = job.data
    const startTime = Date.now()

    try {
      if (job.name === 'ai-monitoring') {
        console.log(`[Worker] Processing job ${job.id} (Log: ${logId}) for platform: ${platform}`)

        // Step 1: Update status to pending (already set by default, but ensuring correctness)
        await db.update(monitoringLogs)
          .set({ status: 'pending' })
          .where(eq(monitoringLogs.id, logId))

        // Step 2: Query AI Adapter
        const adapter = AdapterFactory.getAdapter(platform)
        const { rawResponse } = await adapter.query(prompt, countryCode)

        // Step 3: Parse AI Response
        const structuredData = await parseAIResponse(rawResponse, countryCode)

        // Step 4: Store monitoring results
        await db.insert(monitoringResults).values({
          tenantId,
          promptId,
          logId,
          aiPlatform: platform,
          countryCode,
          content: structuredData, // Structured JSON results (brands, citations)
          rawResponse,
        })

        // Step 5: Update log as success
        const durationMs = Date.now() - startTime
        await db.update(monitoringLogs)
          .set({ 
            status: 'success', 
            durationMs,
            errorMessage: null,
            errorStack: null,
          })
          .where(eq(monitoringLogs.id, logId))

        return { success: true, logId, durationMs }
      }
      
      console.warn(`[Worker] Unknown job name: ${job.name}`)
      return { success: false, error: 'Unknown job name' }
    } catch (error: any) {
      console.error(`[Worker] Error processing job ${job.id} (Log: ${logId}):`, error)
      
      const durationMs = Date.now() - startTime
      
      // Update log as failed
      try {
        await db.update(monitoringLogs)
          .set({ 
            status: 'failed', 
            durationMs,
            errorMessage: error.message || 'Unknown error',
            errorStack: error.stack || null,
          })
          .where(eq(monitoringLogs.id, logId))
      } catch (logError) {
        console.error(`[Worker] Critical: Failed to update error log for ${logId}:`, logError)
      }

      throw error // Ensure BullMQ handles the retry based on backoff strategy
    }
  },
  {
    connection: ioredisConnection,
    concurrency: 5,
    autorun: true, // Start automatically when this file is loaded
    settings: {
      backoffStrategies: {
        adaptive: (attemptsMade: number, type: string, err: Error, job: Job) => {
          // @ts-ignore: job.opts.backoff might be an object
          const delay = typeof job.opts.backoff === 'object' ? job.opts.backoff?.delay || 2000 : 2000;
          
          // 如果错误消息包含速率限制相关词汇，使用更长的退避时间
          const errorMessage = err?.message?.toLowerCase() || '';
          if (errorMessage.includes('rate limit') || errorMessage.includes('429') || errorMessage.includes('too many requests')) {
            return Math.pow(2, attemptsMade - 1) * 10000; // 10s, 20s, 40s...
          }
          
          // 默认指数退避策略: 2s, 4s, 8s...
          return Math.pow(2, attemptsMade - 1) * delay;
        }
      }
    }
  }
)

monitoringWorker.on('completed', (job: Job) => {
  console.log(`[Worker] Job ${job.id} (${job.name}) completed!`)
})

monitoringWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`[Worker] Job ${job?.id ?? 'unknown'} failed with ${err.message}`)
})
