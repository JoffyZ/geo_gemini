import { db } from "@/db";
import { prompts } from "@/db/schema";
import { eq, or, isNull, lt } from "drizzle-orm";
import { serpApiClient } from "./serpapi-client";
import { cpsEngine } from "./cps-engine";
import { subDays } from "date-fns";

export class VolumeSyncManager {
  /**
   * Syncs volume and CPS data for all prompts that haven't been updated in 30 days.
   */
  async syncPrompts(force: boolean = false): Promise<{ synced: number; failed: number }> {
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Find prompts that need syncing: never synced OR synced more than 30 days ago
    const condition = force 
      ? undefined 
      : or(isNull(prompts.lastVolumeSyncAt), lt(prompts.lastVolumeSyncAt, thirtyDaysAgo));

    const promptsToSync = await db.select().from(prompts).where(condition);
    
    let synced = 0;
    let failed = 0;

    for (const prompt of promptsToSync) {
      try {
        console.log(`Syncing volume for prompt: ${prompt.content}`);
        
        // 1. Fetch Volume from API
        const volumeData = await serpApiClient.fetchKeywordVolume(
          prompt.content,
          prompt.countryCode || "us"
        );

        // 2. Update Prompt in DB
        await db.update(prompts)
          .set({
            searchVolume: volumeData.volume,
            difficultyScore: volumeData.difficulty,
            lastVolumeSyncAt: new Date(),
          })
          .where(eq(prompts.id, prompt.id));

        // 3. Recalculate CPS Score
        await cpsEngine.updatePromptCPS(prompt.id);
        
        synced++;
      } catch (error) {
        console.error(`Failed to sync prompt ${prompt.id}:`, error);
        failed++;
      }
    }

    return { synced, failed };
  }
}

export const volumeSyncManager = new VolumeSyncManager();
