import { GeoAdapter } from "./interface";
import { OpenAIAdapter } from "./providers/openai";
import { PerplexityAdapter } from "./providers/perplexity";
import { GeminiAdapter } from "./providers/gemini";
import { GAIOAdapter } from "./providers/google_ai_overviews";

/**
 * Factory class for generating geo-specific AI adapters.
 */
export class AdapterFactory {
  private static instances: Map<string, GeoAdapter> = new Map();

  /**
   * Retrieves an adapter instance for a specific platform.
   * Implements a simple singleton pattern to cache adapter instances.
   */
  public static getAdapter(platform: string): GeoAdapter {
    const cachedInstance = this.instances.get(platform);
    if (cachedInstance) {
      return cachedInstance;
    }

    let adapter: GeoAdapter;

    switch (platform.toLowerCase()) {
      case "chatgpt":
      case "openai":
        const openaiApiKey = process.env.OPENAI_API_KEY || "";
        adapter = new OpenAIAdapter(openaiApiKey);
        break;

      case "perplexity":
        const perplexityApiKey = process.env.PERPLEXITY_API_KEY || "";
        adapter = new PerplexityAdapter(perplexityApiKey);
        break;

      case "gemini":
        const geminiApiKey = process.env.GEMINI_API_KEY || "";
        adapter = new GeminiAdapter(geminiApiKey);
        break;

      case "google_ai_overviews":
      case "gaio":
        const serpApiKey = process.env.SERPAPI_KEY || "";
        adapter = new GAIOAdapter(serpApiKey);
        break;

      default:
        throw new Error(`Platform '${platform}' is not supported.`);
    }

    this.instances.set(platform, adapter);
    return adapter;
  }
}
