import { NextResponse } from 'next/server'
import { monitoringQueue } from '@/lib/queue'

/**
 * Test API route to enqueue a job into BullMQ.
 * GET /api/jobs/test
 */
export async function GET() {
  try {
    // Basic connectivity check: ensures the queue is initialized
    const isPaused = await monitoringQueue.isPaused()
    
    // Add a test job of type 'ai-monitoring'
    const job = await monitoringQueue.add('ai-monitoring', {
      message: 'Hello, Upstash!',
      tenant_id: 'test-tenant-001',
      timestamp: new Date().toISOString(),
      metadata: {
        source: 'api-test',
        priority: 'low'
      }
    })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      queueStatus: isPaused ? 'paused' : 'active',
      message: 'Job enqueued successfully! Check the worker console output.',
      jobData: job.data
    })
  } catch (error: any) {
    console.error('[API] Error adding job to queue:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Unknown error occurred',
        hint: 'Check UPSTASH_REDIS_URL in your environment variables.'
      },
      { status: 500 }
    )
  }
}
