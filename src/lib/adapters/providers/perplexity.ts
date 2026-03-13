import { GeoAdapter } from "../interface";

/**
 * Perplexity implementation of the GeoAdapter.
 * Focuses on providing real-time, geo-aware search results by including the location directly in the query prompt.
 */
export class PerplexityAdapter implements GeoAdapter {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model: string = "llama-3.1-sonar-small-128k-online") {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Helper function to convert country code into a descriptive name.
   */
  private getCountryName(countryCode: string): string {
    const countries: Record<string, string> = {
      US: "the United States",
      CN: "China",
      GB: "the United Kingdom",
      DE: "Germany",
      FR: "France",
      JP: "Japan",
      KR: "South Korea",
      IN: "India",
      BR: "Brazil",
      RU: "Russia",
    };
    return countries[countryCode.toUpperCase()] || countryCode;
  }

  async query(prompt: string, countryCode: string): Promise<{ rawResponse: string }> {
    if (!this.apiKey) {
      throw new Error("Perplexity API Key is not configured.");
    }

    const countryName = this.getCountryName(countryCode);
    const systemPrompt = `You are a helpful assistant. The user is currently in ${countryName}. Your results and answers should prioritize information, search results, and local nuances specific to ${countryName}.`;

    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: 1024,
          temperature: 0.2, // Lower temperature for more consistent, search-oriented results
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Perplexity API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const rawResponse = data.choices[0]?.message?.content || "";

      return { rawResponse };
    } catch (error) {
      console.error("Perplexity Adapter Error:", error);
      throw error;
    }
  }
}
