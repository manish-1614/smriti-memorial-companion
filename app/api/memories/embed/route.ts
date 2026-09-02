import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, EMBEDDING_MODEL } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, title, category } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Memory text is required and must be a string' },
        { status: 400 }
      );
    }

    if (text.length > 8000) {
      return NextResponse.json(
        { error: 'Memory text exceeds maximum allowed length (8000 characters)' },
        { status: 400 }
      );
    }

    const ai = getGeminiClient();

    // Enrich text for embedding with title and category if available
    const contentToEmbed = title ? `Title: ${title}\nCategory: ${category || 'general'}\n\n${text}` : text;

    let values: number[] | undefined;
    let lastError: unknown = null;

    // Retry up to 2 times on transient capacity spike
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.embedContent({
          model: EMBEDDING_MODEL,
          contents: contentToEmbed,
        });

        values = response.embeddings?.[0]?.values;
        if (values && Array.isArray(values)) {
          break;
        }
      } catch (err) {
        lastError = err;
        if (attempt === 0) {
          await new Promise((res) => setTimeout(res, 600));
        }
      }
    }

    if (!values || !Array.isArray(values)) {
      console.warn('Embedding generation error after retry:', lastError);
      return NextResponse.json(
        { error: 'Failed to generate embedding vector from Gemini' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      embedding: values,
      dimension: values.length,
    });
  } catch (err: unknown) {
    console.error('Embedding generation error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error generating embedding';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
