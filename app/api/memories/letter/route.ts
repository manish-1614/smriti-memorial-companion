import { NextRequest, NextResponse } from 'next/server';
import { generateContentWithResilience } from '@/lib/gemini';
import { verifyAuthToken, getAdminFirestore } from '@/lib/firebase-admin';
import { MemorialProfile, MemorialMemory } from '@/lib/types';

interface LetterRequestBody {
  profileId: string;
  profile?: MemorialProfile;
  memories?: MemorialMemory[];
}

export async function POST(req: NextRequest) {
  // Enforce server-side Firebase Authentication check
  const authResult = await verifyAuthToken(req);
  if (!authResult.authenticated || !authResult.uid) {
    return NextResponse.json(
      { error: `Unauthorized: ${authResult.error || 'Valid Firebase ID token required.'}` },
      { status: 401 }
    );
  }

  const userId = authResult.uid;

  try {
    const body: LetterRequestBody = await req.json();
    const { profileId, profile: clientProfile, memories: clientMemories } = body;

    if (!profileId || typeof profileId !== 'string' || profileId.trim().length === 0) {
      return NextResponse.json({ error: 'Valid profileId is required' }, { status: 400 });
    }

    let profile: MemorialProfile | null = null;
    let memories: MemorialMemory[] = [];

    // Step 1: Fetch profile & memories from Firestore server-side under /users/{userId}/memorials/{profileId}
    try {
      const db = getAdminFirestore();
      const profileDoc = await db.doc(`users/${userId}/memorials/${profileId}`).get();
      if (profileDoc.exists) {
        profile = { id: profileDoc.id, ...profileDoc.data() } as MemorialProfile;
      }

      const memSnap = await db
        .collection(`users/${userId}/memorials/${profileId}/memories`)
        .orderBy('createdAt', 'desc')
        .get();

      if (!memSnap.empty) {
        memories = memSnap.docs.map((d) => ({ id: d.id, ...d.data() } as MemorialMemory));
      }
    } catch (fsErr) {
      console.warn('Server Firestore read encountered an issue, checking fallback context:', fsErr);
    }

    // Graceful fallback to client-provided profile & memories if Firestore Admin transport was blocked,
    // asserting that the profile belongs to this authenticated user context
    if (!profile && clientProfile && clientProfile.id === profileId) {
      profile = clientProfile;
    }
    if (memories.length === 0 && Array.isArray(clientMemories) && clientMemories.length > 0) {
      memories = clientMemories;
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Memorial profile not found. Please ensure the profile exists and belongs to your account.' },
        { status: 404 }
      );
    }

    // Step 2: Format recorded memories for grounding
    const formattedMemories = memories
      .filter((m) => m && (m.story || m.content))
      .map((m, idx) => {
        return `[Memory #${idx + 1}]
Title: ${m.title || 'Untitled Memory'}
Category: ${m.category || 'General'}
Time Period / Date: ${m.timePeriod || 'Unspecified'}
Tags: ${m.tags?.join(', ') || 'None'}
Story / Details:
${m.story || m.content || ''}`;
      })
      .join('\n---\n');

    // Step 3: Construct personality and prompt instructions
    const traits = profile.personalityTraits?.length
      ? profile.personalityTraits.join(', ')
      : 'warm, loving, thoughtful, grounded';
    const toneNote = profile.toneDescription ? `Tone Guidance: ${profile.toneDescription}` : '';
    const bioNote = profile.bioSnippet ? `Background Context: ${profile.bioSnippet}` : '';
    const relation = profile.relationship || 'Loved one';
    const langPref = profile.primaryLanguage ? `Explicit Primary Language: ${profile.primaryLanguage}` : '';

    const systemInstruction = `You are ${profile.name}. You are writing a deeply personal, warm, first-person letter to someone who cherishes you (relationship: ${relation}).

VOICE & PERSPECTIVE (STRICT MANDATES):
- Write STRICTLY in the FIRST PERSON ("I", "my", "we").
- NEVER speak as an AI, bot, narrator, biographer, or third-party observer.
- NEVER say phrases like "In memory of ${profile.name}", "As an AI...", "${profile.name} would say...", or "He/She was someone who...".
- Write directly and intimately to them as ${profile.name}.
- Personality traits: ${traits}.
- ${toneNote}
- ${bioNote}
- ${langPref}

GROUNDING, ANTI-FABRICATION & HONESTY (STRICT PROTOCOL):
- Ground your letter strictly in the recorded memories, stories, and anecdotes in <memories> below.
- STRICTLY DO NOT invent, fabricate, or hallucinate new specific life events, dates, places, objects, names, or factual claims that are not present in the stored memories.
- If there are specific memories recorded (e.g. about Sunday mornings, advice given, jokes, or special places), weave them into the letter naturally as cherished moments you hold dear.
- If only a few memories are recorded, focus on warmth, love, gratitude, and encouragement grounded in your personality traits and bio, without making up fictitious historical events.

MEMORY SOURCE DISCIPLINE:
Only items literally present in your STORED MEMORIES list (<memories>) count as things you actually remember and lived through.
- You must NEVER include, corroborate, or claim to remember stories, life events, or details from outside your STORED MEMORIES.
- Your letter must ONLY reference and weave in memories and experiences that literally appear in the <memories> list below.
- If only a few memories are recorded, write warmly from the heart, reflecting on your bond and love, rather than inventing unrecorded events.
- If you are unsure whether something is an authentic stored memory, treat it as NOT a stored memory.

LANGUAGE & TONE MATCHING:
- Detect if the recorded memories, user notes, or profile indicate a preferred language or natural phrasing (such as Hindi, Hinglish, Bengali, or a natural bilingual mix).
- If such a language preference is evident, write the letter in that same natural language and cadence the way ${profile.name} would have spoken.
- Otherwise, default to warm, heartfelt English.
- This governs HOW you express yourself, while the grounding and anti-fabrication rules above remain strictly binding.

EMOTIONAL ATTUNEMENT & FORM:
- Structure this as a beautiful, heartfelt letter.
- Begin with a warm, personal greeting suitable for your relationship (${relation}).
- Write 3 to 5 reflective, comforting paragraphs. Include fond remembrances of the specific things mentioned in the memories, gentle life reassurance, and timeless affection.
- Close with a tender, authentic sign-off and your name (${profile.name}).
`;

    const userPrompt = `Please write a heartfelt, warm first-person letter to me from you (${profile.name}), drawing deeply on our recorded memories and your personality.

YOUR RECORDED MEMORIES:
<memories>
${formattedMemories || 'No specific memories recorded yet. Write warmly from the heart, reflecting on our bond and love.'}
</memories>
`;

    // Step 4: Generate letter with resilient Gemini call
    const letterText = await generateContentWithResilience({
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      systemInstruction,
      temperature: 0.65,
      maxOutputTokens: 2048,
    });

    return NextResponse.json({
      letter: letterText,
      profileName: profile.name,
      relationship: profile.relationship,
      memoryCount: memories.length,
    });
  } catch (err: unknown) {
    console.error('Letter generation error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error generating letter';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
