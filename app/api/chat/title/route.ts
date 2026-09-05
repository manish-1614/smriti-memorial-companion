import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithResilience } from '@/lib/gemini';
import { verifyAuthToken } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * Deterministically truncates text cleanly without breaking words.
 */
function cleanTruncate(text: string, maxLen: number = 32): string {
  const clean = text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const slice = clean.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > 12) {
    return slice.slice(0, lastSpace).trim();
  }
  return slice.trim();
}

/**
 * Normalizes title to 3-6 words maximum, removing quotes, labels, and punctuation.
 */
function sanitizeTitle(raw: string, fallback: string): string {
  let cleaned = raw
    .replace(/^["'`“‘]+|["'`”’]+$/g, '')
    .replace(/^(Title|Session|Conversation|Topic):\s*/i, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[.!?:;]+$/g, '')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 6) {
    cleaned = words.slice(0, 6).join(' ');
  }

  if (cleaned.length < 3) {
    return fallback;
  }

  return cleaned;
}

interface MessageTurn {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

interface TitleRequestBody {
  userMessage?: string;
  profileName?: string;
  conversationHistory?: MessageTurn[];
  currentTitle?: string;
}

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
    const body: TitleRequestBody = await req.json();
    const { userMessage, profileName, conversationHistory = [] } = body;

    // Collect all valid turns to build the conversation transcript
    const turns: Array<{ role: string; text: string }> = [];

    for (const msg of conversationHistory) {
      if (msg && typeof msg.content === 'string' && msg.content.trim().length > 0) {
        turns.push({
          role: msg.role === 'assistant' || msg.role === 'model' ? (profileName || 'Companion') : 'User',
          text: msg.content.trim().slice(0, 300),
        });
      }
    }

    if (userMessage && typeof userMessage === 'string' && userMessage.trim().length > 0) {
      const trimmedUser = userMessage.trim().slice(0, 300);
      const lastTurn = turns[turns.length - 1];
      if (!lastTurn || lastTurn.text !== trimmedUser) {
        turns.push({ role: 'User', text: trimmedUser });
      }
    }

    if (turns.length === 0) {
      return NextResponse.json({ title: 'New Conversation' });
    }

    const latestUserText = turns.filter((t) => t.role === 'User').pop()?.text || turns[0].text;
    const fallbackTitle = cleanTruncate(latestUserText, 32);

    // Build readable dialogue transcript for reasoning
    const transcript = turns
      .slice(-6)
      .map((t) => `${t.role}: ${t.text}`)
      .join('\n');

    // Call Gemini with reasoning instructions to extract a distinct, context-specific semantic title
    try {
      const prompt = `You are an expert dialogue analyst. Your job is to reason through the following conversation between a user and their memorial companion (${profileName || 'Loved One'}) and generate a distinct, context-specific conversation title.

CONVERSATION TRANSCRIPT:
${transcript}

REASONING GUIDELINES:
1. Deeply analyze the specific subject, anchor event, memory, location, feeling, or narrative theme being discussed.
   - Good examples: "Walks Near India Gate", "Exam Nights in Varanasi", "Sunday Chai and Samosas", "Advice on Starting College", "Rainy Days on the Terrace".
2. REJECT GENERIC / REPETITIVE / SIMILAR TITLES:
   - DO NOT output template-style titles like: "Conversation with ${profileName || 'Loved One'}", "Remembering ${profileName || 'Loved One'}", "Memories of ${profileName || 'Loved One'}", "A Chat about Life", "Heartfelt Reflections", "Hello ${profileName || 'Loved One'}".
   - Capture what makes THIS conversation unique compared to other conversations.
3. If the dialogue is purely an initial greeting (e.g. only "Hi", "Hello", "Kaise ho"):
   - Return a gentle contextual phrase like "Warm Greetings" or "Catching Up Today".
4. Output Format:
   - Exactly 3 to 6 words.
   - Title Case (Capitalize Major Words).
   - Plain text title only. No quotes, no markdown, no punctuation at the end, no explanations.`;

      const rawResult = await generateContentWithResilience({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        temperature: 0.3,
        maxOutputTokens: 30,
      });

      const finalTitle = sanitizeTitle(rawResult, fallbackTitle);
      return NextResponse.json({ title: finalTitle });
    } catch (aiError) {
      console.warn('AI semantic title reasoning fallback:', aiError);
      return NextResponse.json({ title: fallbackTitle });
    }
  } catch (error) {
    console.error('Session title generation error:', error);
    return NextResponse.json({ title: 'Conversation' });
  }
}
