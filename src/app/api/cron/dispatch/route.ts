import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { prompts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { monitoringQueue } from '@/lib/queue';

/**
 * Vercel Cron Dispatcher.
 * 
 * This endpoint is triggered by Vercel Cron to distribute active prompts 
 * into BullMQ for monitoring across different countries and platforms.
 */
export async function POST(req: NextRequest) {
  // 1. Security check
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Query active prompts
    const activePrompts = await db.query.prompts.findMany({
      where: eq(prompts.isActive, true),
    });

    // 3. Define target countries and platforms
    const countries = ['US', 'GB', 'CN'];
    // In schema.ts: ai_platform enum is ['chatgpt', 'perplexity', 'gemini', 'google_ai_overviews']
    // We map 'gaio' to 'google_ai_overviews' as specified in requirements
    const platforms = ['chatgpt', 'perplexity', 'gemini', 'google_ai_overviews'] as const;
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    let jobCount = 0;

    // 4. Fragment and dispatch logic
    for (const prompt of activePrompts) {
      for (const countryCode of countries) {
        for (const platform of platforms) {
          // Job ID: ${promptId}-${countryCode}-${platform}-${date}
          // The platform name here should match the aiPlatformEnum in db schema.
          const jobId = `${prompt.id}-${countryCode}-${platform}-${date}`;
          
          await monitoringQueue.add(
            'ai-monitoring',
            {
              promptId: prompt.id,
              tenantId: prompt.tenantId,
              countryCode,
              platform,
            },
            {
              jobId,
              // BullMQ's jobId will prevent duplicates if the same jobId is added twice.
              // removeOnComplete: true, // Optional: if we want to clean up immediately
            }
          );
          jobCount++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Dispatched ${jobCount} jobs for ${activePrompts.length} active prompts.`,
      dispatched: jobCount 
    });
  } catch (error: any) {
    console.error('[Cron] Failed to dispatch jobs:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

// Support GET for manual triggering (optional, but sometimes useful for testing if Vercel Cron allows GET)
// Given the requirement says "校验 Authorization: Bearer ${CRON_SECRET} 头部", 
// we keep it as POST as most cron triggers use POST, but we could add GET if needed.
// For now, we follow standard Vercel Cron POST trigger.
