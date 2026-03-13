import { GeoAdapter } from "../interface";

/**
 * Google Gemini implementation of the GeoAdapter.
 * Handles geo-simulation by providing specific geographical context instructions in the system instruction part of the Gemini API.
 */
export class GeminiAdapter implements GeoAdapter {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model: string = "gemini-1.5-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

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
      throw new Error("Gemini API Key is not configured.");
    }

    const countryName = this.getCountryName(countryCode);
    const systemInstruction = `Assume the user is located in ${countryName}. Your responses should reflect local context, search trends, and provide insights that are relevant to this geographic location. Ensure that the response follows local standards and nuances as if the user were physically present there.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return { rawResponse };
    } catch (error) {
      console.error("Gemini Adapter Error:", error);
      throw error;
    }
  }
}
