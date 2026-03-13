import { GeoAdapter } from "../interface";

/**
 * OpenAI implementation of the GeoAdapter.
 * Handles geo-simulation by injecting location-based instructions into the system prompt.
 */
export class OpenAIAdapter implements GeoAdapter {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model: string = "gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Translates common country codes into full country names for the prompt.
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
      // Default to returning the code if name not found
    };
    return countries[countryCode.toUpperCase()] || countryCode;
  }

  async query(prompt: string, countryCode: string): Promise<{ rawResponse: string }> {
    if (!this.apiKey) {
      throw new Error("OpenAI API Key is not configured.");
    }

    const countryName = this.getCountryName(countryCode);
    const systemPrompt = `Assume the user is located in ${countryName}. Provide localized insights and search results as seen from this location. If applicable, respond in the primary language used in that region while maintaining high-quality information.`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const rawResponse = data.choices[0]?.message?.content || "";

      return { rawResponse };
    } catch (error) {
      console.error("OpenAI Adapter Error:", error);
      throw error;
    }
  }
}
