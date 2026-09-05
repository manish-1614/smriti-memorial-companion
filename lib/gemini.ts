import { GoogleGenAI } from '@google/genai';

// Lazy initialization of GoogleGenAI SDK to prevent app startup crashes if key is absent
let genAIClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in server environment');
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

export const EMBEDDING_MODEL = 'gemini-embedding-2-preview';
export const CHAT_MODEL = 'gemini-3.1-flash-lite';
export const FALLBACK_CHAT_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-flash-latest',
];

/**
 * Executes a Gemini generateContent call with automatic retry on 503/429
 * and graceful fallback across alternative Flash models if a spike occurs.
 */
export async function generateContentWithResilience(params: {
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const ai = getGeminiClient();
  let lastError: unknown = null;

  for (const modelName of FALLBACK_CHAT_MODELS) {
    // Up to 2 attempts per model with backoff
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature ?? 0.65,
            maxOutputTokens: params.maxOutputTokens ?? 1024,
          },
        });

        if (response.text) {
          return response.text;
        }
      } catch (err: unknown) {
        lastError = err;
        const errStr = String(err);
        const isUnavailableOrRateLimited =
          errStr.includes('503') ||
          errStr.includes('UNAVAILABLE') ||
          errStr.includes('429') ||
          errStr.includes('RESOURCE_EXHAUSTED') ||
          errStr.includes('high demand');

        if (isUnavailableOrRateLimited && attempt === 0) {
          // Wait 600ms before second attempt on same model
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }
        // If second attempt or other error, break inner loop to try next model in fallback cascade
        break;
      }
    }
  }

  // If all models in the fallback cascade encountered errors, rethrow the last error
  throw lastError || new Error('Failed to generate response across all fallback models');
}

