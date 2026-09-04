import { NextRequest, NextResponse } from 'next/server';
import { getGeminiClient, EMBEDDING_MODEL, generateContentWithResilience } from '@/lib/gemini';
import { verifyAuthToken } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  // Enforce server-side Firebase Authentication check
  const authResult = await verifyAuthToken(req);
  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: `Unauthorized: ${authResult.error || 'Valid Firebase ID token required.'}` },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { userMessage, assistantReply, profileName, relationship, existingMemories } = body;

    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length < 8) {
      return NextResponse.json({ eligible: false, reason: 'Message too short' });
    }

    const ai = getGeminiClient();

    // Context of current existing memories to avoid redundant duplicates
    const existingSnippet = Array.isArray(existingMemories)
      ? existingMemories.slice(0, 10).map((m: { title?: string; story?: string }) => `- ${m.title || ''}: ${m.story || ''}`).join('\n')
      : '';

    const evaluationPrompt = `You are a cognitive memory extraction engine for a memorial and remembrance application.
Your job is to analyze a conversation exchange between a user and a digital persona of their loved one (${profileName}, relationship: ${relationship || 'Loved one'}).

Goal: Determine if the USER's message contains a real, personal, autobiographical anecdote, life habit, saying, preference, milestone, favorite thing, or cherished personal memory regarding ${profileName} that is worth preserving permanently in ${profileName}'s memory vault.

User Message: "${userMessage.trim()}"
Assistant Reply Context: "${(assistantReply || '').slice(0, 300)}"

Existing Known Memories:
${existingSnippet || 'None'}

Instructions:
1. If the message is only a generic greeting (e.g., "hi", "how are you", "good morning"), a simple emotional check-in ("I miss you", "I feel sad today"), a question without personal story ("What was your favorite song?"), or duplicate of existing memories, output JSON with "eligible": false.
2. If the message contains a meaningful personal story, childhood event, habit, favorite dish/hobby, wisdom, life advice, or memorable anecdote shared about ${profileName}, output JSON with:
   - "eligible": true
   - "title": A concise, beautiful 3-6 word title for this memory
   - "story": A clear, clean 1-3 sentence summary of the memory from the perspective of remembering ${profileName}
   - "category": One of ["anecdote", "quote", "lesson", "habit", "favorite", "milestone"]
   - "tags": Array of 2-4 lowercase tag strings (e.g. ["cooking", "diwali", "family"])

Return ONLY a valid JSON object without markdown fences, like:
{"eligible": true, "title": "...", "story": "...", "category": "anecdote", "tags": ["tag1", "tag2"]}`;

    const rawResponse = await generateContentWithResilience({
      contents: [{ role: 'user', parts: [{ text: evaluationPrompt }] }],
      temperature: 0.2,
      maxOutputTokens: 300,
    });

    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsed: {
      eligible: boolean;
      title?: string;
      story?: string;
      category?: 'anecdote' | 'quote' | 'lesson' | 'habit' | 'favorite' | 'milestone';
      tags?: string[];
    };

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ eligible: false, reason: 'Failed to parse JSON' });
    }

    if (!parsed.eligible || !parsed.story || !parsed.title) {
      return NextResponse.json({ eligible: false });
    }

    // Now compute vector embedding for this new memory
    let embedding: number[] | undefined;
    try {
      const embedContent = `Title: ${parsed.title}\nCategory: ${parsed.category || 'anecdote'}\n\n${parsed.story}`;
      const embedRes = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: embedContent,
      });
      embedding = embedRes.embeddings?.[0]?.values;
    } catch (embedErr) {
      console.warn('Could not generate embedding for extracted memory:', embedErr);
    }

    return NextResponse.json({
      eligible: true,
      memory: {
        title: parsed.title,
        story: parsed.story,
        category: parsed.category || 'anecdote',
        tags: Array.isArray(parsed.tags) ? parsed.tags : ['conversation'],
        embedding: embedding || null,
      },
    });
  } catch (error) {
    console.error('Error in semantic memory extraction route:', error);
    return NextResponse.json({ eligible: false, error: 'Internal server error' }, { status: 500 });
  }
}
