/**
 * Interface for AI adapters supporting geo-specific queries.
 */
export interface GeoAdapter {
  /**
   * Sends a prompt to the AI with geographical context.
   * @param prompt - The user's query or prompt.
   * @param countryCode - The target country code (e.g., 'US', 'CN', 'GB').
   * @returns A promise resolving to an object containing the raw AI response.
   */
  query(prompt: string, countryCode: string): Promise<{ rawResponse: string }>;
}
