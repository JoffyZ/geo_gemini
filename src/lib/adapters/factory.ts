import { GeoAdapter } from "./interface";
import { OpenAIAdapter } from "./providers/openai";
import { PerplexityAdapter } from "./providers/perplexity";
import { GeminiAdapter } from "./providers/gemini";
import { GAIOAdapter } from "./providers/google_ai_overviews";

/**
 * Factory class for generating geo-specific AI adapters.
 * Includes fallback logic to Gemini for testing purposes.
 */
export class AdapterFactory {
  private static instances: Map<string, GeoAdapter> = new Map();

  public static getAdapter(platform: string): GeoAdapter {
    const cachedInstance = this.instances.get(platform);
    if (cachedInstance) {
      return cachedInstance;
    }

    let adapter: GeoAdapter;
    const geminiKey = process.env.GEMINI_API_KEY || "";

    switch (platform.toLowerCase()) {
      case "chatgpt":
      case "openai":
        const openaiApiKey = process.env.OPENAI_API_KEY || "";
        if (!openaiApiKey && geminiKey) {
          console.warn("[Adapter] OpenAI Key missing, using Gemini as fallback proxy.");
          adapter = new GeminiAdapter(geminiKey);
        } else {
          adapter = new OpenAIAdapter(openaiApiKey);
        }
        break;

      case "perplexity":
        const perplexityApiKey = process.env.PERPLEXITY_API_KEY || "";
        if (!perplexityApiKey && geminiKey) {
          console.warn("[Adapter] Perplexity Key missing, using Gemini as fallback proxy.");
          adapter = new GeminiAdapter(geminiKey);
        } else {
          adapter = new PerplexityAdapter(perplexityApiKey);
        }
        break;

      case "gemini":
        adapter = new GeminiAdapter(geminiKey);
        break;

      case "google_ai_overviews":
      case "gaio":
        const serpApiKey = process.env.SERPAPI_KEY || "";
        if (!serpApiKey && geminiKey) {
          console.warn("[Adapter] SerpApi Key missing, using Gemini as fallback proxy.");
          adapter = new GeminiAdapter(geminiKey);
        } else {
          adapter = new GAIOAdapter(serpApiKey);
        }
        break;

      default:
        throw new Error(`Platform '${platform}' is not supported.`);
    }

    this.instances.set(platform, adapter);
    return adapter;
  }
}
