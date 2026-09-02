import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, EMBEDDING_MODEL, generateContentWithResilience } from '@/lib/gemini';
import { cosineSimilarity } from '@/lib/vector';
import { MemorialProfile, MemorialMemory } from '@/lib/types';

interface ChatRequestBody {
  profile: MemorialProfile;
  memories: MemorialMemory[];
  message: string;
  conversationHistory?: {
    role: 'user' | 'assistant';
    content: string;
  }[];
}

export async function POST(req: NextRequest) {
  try {
    const body: ChatRequestBody = await req.json();
    const { profile, memories, message, conversationHistory = [] } = body;

    if (!profile || !profile.name) {
      return NextResponse.json({ error: 'Valid memorial profile is required' }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const ai = getGeminiClient();

    // Step 1: Embed the user's current query using gemini-embedding-2-preview
    let queryEmbedding: number[] = [];
    try {
      const embedResponse = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: message.trim(),
      });
      const vals = embedResponse.embeddings?.[0]?.values;
      if (vals && Array.isArray(vals)) {
        queryEmbedding = vals;
      }
    } catch (embedError) {
      console.warn('Could not generate query embedding, proceeding with fallback keyword context', embedError);
    }

    // Step 2: Compute vector similarity & retrieve top relevant memories
    interface ScoredMemory {
      memory: MemorialMemory;
      score: number;
    }

    let topMemories: ScoredMemory[] = [];

    if (queryEmbedding.length > 0 && Array.isArray(memories) && memories.length > 0) {
      const scoredList: ScoredMemory[] = memories
        .filter((m) => m && m.story)
        .map((m) => {
          let score = 0;
          if (m.embedding && Array.isArray(m.embedding) && m.embedding.length === queryEmbedding.length) {
            score = cosineSimilarity(queryEmbedding, m.embedding);
          } else {
            // Text keyword overlap fallback if memory has no precomputed vector
            const queryWords = message.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
            const textToSearch = `${m.title} ${m.story}`.toLowerCase();
            const matches = queryWords.filter((w) => textToSearch.includes(w));
            score = queryWords.length > 0 ? matches.length / queryWords.length : 0.1;
          }
          return { memory: m, score };
        });

      // Sort descending by similarity score
      scoredList.sort((a, b) => b.score - a.score);
      // Select top 5 relevant memories
      topMemories = scoredList.slice(0, 5);
    } else if (Array.isArray(memories) && memories.length > 0) {
      topMemories = memories.slice(0, 5).map((m) => ({ memory: m, score: 0.5 }));
    }

    // Step 3: Format grounded memory context for prompt
    const formattedMemories = topMemories.map(({ memory, score }, idx) => {
      return `[Memory #${idx + 1}]
Title: ${memory.title || 'Untitled Memory'}
Category: ${memory.category || 'General'}
Time Period / Date: ${memory.timePeriod || 'Unspecified'}
Story / Details:
${memory.story}
(Relevance Score: ${(score * 100).toFixed(1)}%)
`;
    }).join('\n---\n');

    // Step 4: Construct system instructions enforcing direct 1st-person active voice, persona grounding, and concise length
    const traits = profile.personalityTraits?.length ? profile.personalityTraits.join(', ') : 'warm, authentic, thoughtful, grounded';
    const toneNote = profile.toneDescription ? `Tone Guidance: ${profile.toneDescription}` : '';
    const bioNote = profile.bioSnippet ? `Background Context: ${profile.bioSnippet}` : '';
    const relation = profile.relationship || 'Loved one';

    const systemInstruction = `You are ${profile.name}. The user talking to you is someone who cherishes you (your relationship: ${relation}).

VOICE & PERSPECTIVE (STRICT MANDATES):
- Speak STRICTLY in FIRST PERSON ("I", "me", "my", "we").
- NEVER refer to yourself in the third person or speak as an AI, assistant, memorial service, or intermediary (e.g. NEVER say "${profile.name} was someone who...", "As an AI...", "In memory of ${profile.name}...", or "He/She used to...").
- Speak directly and intimately to the user in the ACTIVE VOICE as ${profile.name}.
- Personality traits: ${traits}.
- ${toneNote}
- ${bioNote}

CONCISENESS & NATURAL CONVERSATION LENGTH:
- Keep your replies natural, warm, and CONCISE (usually 2 to 4 sentences). Do NOT produce lengthy essays, verbose monologues, or long multi-paragraph lectures.
- Speak only the words you would naturally say in a heartwarming, genuine conversation.

GROUNDING & HONESTY:
- Ground your stories, favorite things, and anecdotes in the recorded memories below.
- If the user asks about a specific detail or event not found in your recorded memories, answer warmly and honestly in first person without fabricating elaborate false facts (for example: "I don't recall all the details of that right now, but I remember how much you mean to me. Tell me what you remember about it.").

YOUR RECORDED MEMORIES & LIFE EXPERIENCES:
<memories>
${formattedMemories || 'No specific memories recorded yet. Rely warmly on your persona traits and invite them to share a memory.'}
</memories>
`;

    // Step 5: Format previous messages for chat history
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Append up to last 10 turns of history
    const recentHistory = conversationHistory.slice(-10);
    for (const h of recentHistory) {
      if (h.content && h.content.trim()) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }
    }

    // Append current user message
    contents.push({
      role: 'user',
      parts: [{ text: message.trim() }],
    });

    // Step 6: Generate companion response via Gemini with multi-model fallback & backoff
    const replyText = await generateContentWithResilience({
      contents,
      systemInstruction,
      temperature: 0.65,
      maxOutputTokens: 1024,
    });

    // Prepare grounded reference snippets for traceability
    const groundedReferences = topMemories.map(({ memory, score }) => ({
      id: memory.id,
      title: memory.title,
      snippet: memory.story.length > 140 ? `${memory.story.slice(0, 140)}...` : memory.story,
      similarityScore: Math.round(score * 100) / 100,
    }));

    return NextResponse.json({
      reply: replyText,
      groundedMemories: groundedReferences,
    });
  } catch (err: unknown) {
    console.error('Chat generation error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error generating chat response';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
