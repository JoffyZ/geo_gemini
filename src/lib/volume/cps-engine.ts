import { db } from "@/db";
import { prompts, intentCategoryEnum } from "@/db/schema";
import { eq } from "drizzle-orm";
import { serpApiClient } from "./serpapi-client";

export type IntentCategory = "informational" | "commercial" | "transactional";

export class CPSEngine {
  /**
   * Calculates the Commercial Priority Score (CPS) for a given set of metrics.
   * CPS = (Volume_Score * 0.4) + (Intent_Value * 0.4) + (Trend_Velocity * 0.2)
   */
  calculateCPS(volume: number, intent: IntentCategory, trendVelocity: number = 0): number {
    // Volume Score: log10 normalization (0-1 range for volume up to 1,000,000)
    const volumeScore = Math.min(Math.log10(volume + 1) / 6, 1);

    // Intent Value weights
    const intentWeights: Record<IntentCategory, number> = {
      transactional: 1.0,
      commercial: 0.8,
      informational: 0.5,
    };
    const intentValue = intentWeights[intent] || 0.5;

    // Trend Velocity Score (assuming trendVelocity is percentage growth, e.g., 0.5 for 50%)
    // Normalize velocity: growth of 100% or more gets 1.0
    const trendScore = Math.min(Math.max(trendVelocity, 0), 1.5); // Cap at 1.5 for viral trends

    const cps = (volumeScore * 0.4) + (intentValue * 0.4) + (trendScore * 0.2);
    
    // Round to 2 decimal places
    return Math.round(cps * 100) / 100;
  }

  /**
   * Updates the CPS score for a specific prompt.
   */
  async updatePromptCPS(promptId: string): Promise<void> {
    const promptList = await db.select().from(prompts).where(eq(prompts.id, promptId));
    if (promptList.length === 0) return;

    const prompt = promptList[0];
    
    // Default values if missing
    const volume = prompt.searchVolume || 0;
    const intent = (prompt.intentCategory as IntentCategory) || "informational";
    
    // For now, we use a simple trend velocity or default to 0
    // In a full implementation, we would calculate this from historical Trends data
    const trendVelocity = 0; 

    const score = this.calculateCPS(volume, intent, trendVelocity);

    await db.update(prompts)
      .set({ cpsScore: score })
      .where(eq(prompts.id, promptId));
  }

  /**
   * Batch updates all active prompts.
   */
  async batchUpdateCPS(): Promise<void> {
    const allPrompts = await db.select().from(prompts);
    
    for (const prompt of allPrompts) {
      await this.updatePromptCPS(prompt.id);
    }
  }
}

export const cpsEngine = new CPSEngine();
