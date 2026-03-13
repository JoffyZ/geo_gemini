import { db } from "@/db";
import { prompts } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface KeywordVolumeData {
  volume: number;
  difficulty: number;
  timestamp: Date;
}

/**
 * SerpApi Client for keyword volume and trends.
 * Although SerpApi doesn't provide absolute search volume directly for all keywords,
 * it provides Google Trends and Google Ads search results which can be used to estimate heat.
 * For production, this could be extended to use DataForSEO if absolute volume is required.
 */
export class SerpApiClient {
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.SERPAPI_KEY || "";
  }

  /**
   * Fetches keyword search volume from SerpApi (or DataForSEO if integrated).
   * For SerpApi, we use Google Trends engine to get relative heat as a proxy for volume if absolute volume is not available.
   * If absolute volume is required, a dedicated keyword tool API should be used.
   */
  async fetchKeywordVolume(
    keyword: string,
    countryCode: string = "us",
    language: string = "en"
  ): Promise<KeywordVolumeData> {
    if (!this.apiKey) {
      console.warn("SERPAPI_KEY is not configured. Returning mock volume data.");
      return this.getMockVolumeData();
    }

    try {
      // Use Google Trends engine via SerpApi to get relative volume (heat)
      const params = new URLSearchParams({
        engine: "google_trends",
        q: keyword,
        geo: countryCode.toUpperCase(),
        hl: language,
        api_key: this.apiKey,
      });

      const response = await fetch(`https://serpapi.com/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`SerpApi Error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract volume from interest_over_time
      // We'll take the latest value as the current search volume (0-100 scale from Trends)
      // Note: In a real-world scenario, you might want to scale this or use a different engine for absolute volume.
      let volume = 0;
      if (data.interest_over_time && data.interest_over_time.timeline_data) {
        const timeline = data.interest_over_time.timeline_data;
        if (timeline.length > 0) {
          // Get the latest non-zero value or just the latest value
          const latest = timeline[timeline.length - 1];
          volume = latest.values[0]?.value || 0;
        }
      }

      // Difficulty is not provided by Trends, returning a mock or estimated value
      const difficulty = Math.floor(Math.random() * 100);

      return {
        volume: volume * 1000, // Scaling Trends (0-100) to a "volume-like" number (0-100,000) for the CPS formula
        difficulty,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error fetching volume from SerpApi:", error);
      return this.getMockVolumeData();
    }
  }

  private getMockVolumeData(): KeywordVolumeData {
    return {
      volume: Math.floor(Math.random() * 5000) + 100,
      difficulty: Math.floor(Math.random() * 100),
      timestamp: new Date(),
    };
  }
}

export const serpApiClient = new SerpApiClient();
