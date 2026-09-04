/**
 * Semantic Language & Tone Analyzer
 * Analyzes incoming user messages to detect language, script, code-switching mode,
 * and emotional/dialogue tone to guide conversational mirroring.
 */

export interface SemanticAnalysisResult {
  detectedLanguage: 'HINDI_DEVANAGARI' | 'HINGLISH' | 'ENGLISH' | 'BENGALI' | 'REGIONAL' | 'MIXED';
  languageLabel: string;
  script: 'Devanagari' | 'Latin/Roman' | 'Bengali' | 'Other';
  detectedTone: 'Grieving & Longing' | 'Nostalgic & Reminiscing' | 'Seeking Guidance & Comfort' | 'Playful & Lighthearted' | 'Everyday Warmth & Conversational';
  toneGuidance: string;
  targetLanguageDirective: string;
  exampleStyleSnippet: string;
}

// Common Romanized Hindi/Urdu words indicating Hinglish
const HINGLISH_TOKENS = new Set([
  'kya', 'kaise', 'kaisa', 'kaisi', 'kyun', 'kyu', 'kab', 'kahan', 'kaha', 'kidhar', 'kitna', 'kitni', 'kitne',
  'kisne', 'kisse', 'jab', 'tab', 'ab', 'abhi', 'tabhi', 'jabhi', 'mai', 'main', 'mujhe', 'mujhko', 'mera',
  'meri', 'mere', 'hum', 'hume', 'humko', 'hamara', 'hamari', 'hamare', 'aap', 'aapka', 'aapki', 'aapke',
  'tum', 'tumhara', 'tumhari', 'tumhare', 'tera', 'teri', 'tere', 'tujhe', 'tujhko', 'ye', 'yeh', 'wo',
  'woh', 'inka', 'unka', 'inko', 'unko', 'sab', 'sabhi', 'koi', 'kisi', 'kaun', 'hai', 'hain', 'ho',
  'hoon', 'hun', 'tha', 'thi', 'the', 'hoga', 'hogi', 'hoge', 'honge', 'raha', 'rahi', 'rahe', 'hua',
  'hui', 'hue', 'kar', 'karo', 'karna', 'karta', 'karti', 'karte', 'kiya', 'kiye', 'karke', 'diya',
  'liya', 'gaya', 'gayi', 'gaye', 'ja', 'jao', 'jana', 'jata', 'jati', 'jate', 'aao', 'aana', 'aata',
  'aati', 'aate', 'bolo', 'boli', 'bola', 'bole', 'bolna', 'suno', 'suni', 'suna', 'sune', 'sunna',
  'dekho', 'dekha', 'dekhi', 'dekhe', 'dekhna', 'batao', 'bataya', 'batayi', 'bataye', 'batana',
  'lagta', 'lagti', 'lagte', 'laga', 'lagi', 'lage', 'chal', 'chalo', 'chale', 'chalna', 'chalta',
  'chalti', 'chalte', 'baitho', 'baitha', 'baithi', 'baithe', 'rehna', 'rehte', 'rehti', 'rehta',
  'ruka', 'ruki', 'ruke', 'socho', 'socha', 'sochna', 'na', 'nahi', 'nahin', 'mat', 'toh', 'to', 'hi',
  'bhi', 'pehle', 'baad', 'sath', 'saath', 'bina', 'waise', 'aise', 'bohot', 'bahut', 'thoda', 'thodi',
  'thode', 'zyada', 'jyada', 'bilkul', 'pakka', 'bas', 'sach', 'sachme', 'zaroor', 'zarur', 'shayad',
  'kripya', 'shukriya', 'dhanyawad', 'namaste', 'pranam', 'namaskar', 'yaar', 'bhai', 'accha', 'achha',
  'achhi', 'achhe', 'theek', 'thik', 'arey', 'arre', 'haan', 'haa', 'yaad', 'yaadein', 'baat', 'baatein',
  'din', 'raat', 'shaam', 'subah', 'dopahar', 'waqt', 'samay', 'chai', 'khana', 'paani', 'roti', 'ghar',
  'rasta', 'dost', 'didi', 'bhaiya', 'behen', 'beta', 'beti', 'papa', 'pitaji', 'mummy', 'mataji', 'ma',
  'maa', 'babuji', 'dada', 'dadi', 'nana', 'nani', 'chacha', 'chachi', 'bua', 'mama', 'mami', 'mandir',
  'ghat', 'mithai', 'khushi', 'dil', 'pyaar', 'pyar', 'man', 'mann'
]);

export function analyzeSemanticLanguageAndTone(message: string): SemanticAnalysisResult {
  const cleanMsg = message.trim();

  // 1. Detect Scripts
  const hasDevanagari = /[\u0900-\u097F]/.test(cleanMsg);
  const hasBengali = /[\u0980-\u09FF]/.test(cleanMsg);
  const hasTamil = /[\u0B80-\u0BFF]/.test(cleanMsg);
  const hasTelugu = /[\u0C00-\u0C7F]/.test(cleanMsg);

  // 2. Tokenize Roman text to inspect for Hinglish
  const words = cleanMsg.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  let hinglishCount = 0;
  for (const w of words) {
    if (HINGLISH_TOKENS.has(w)) {
      hinglishCount++;
    }
  }

  // Determine Language Mode
  let detectedLanguage: SemanticAnalysisResult['detectedLanguage'] = 'ENGLISH';
  let languageLabel = 'English';
  let script: SemanticAnalysisResult['script'] = 'Latin/Roman';
  let targetLanguageDirective = '';
  let exampleStyleSnippet = '';

  if (hasDevanagari) {
    detectedLanguage = 'HINDI_DEVANAGARI';
    languageLabel = 'Hindi (Devanagari script)';
    script = 'Devanagari';
    targetLanguageDirective = 'Respond strictly in authentic, natural Hindi using Devanagari script (देवनागरी). DO NOT reply in English or Romanized script.';
    exampleStyleSnippet = 'हाँ बेटा, मुझे भी वह दिन बहुत अच्छी तरह याद है।';
  } else if (hasBengali) {
    detectedLanguage = 'BENGALI';
    languageLabel = 'Bengali';
    script = 'Bengali';
    targetLanguageDirective = 'Respond in warm Bengali using Bengali script.';
    exampleStyleSnippet = 'হ্যাঁ, আমারও সেই দিনটার কথা মনে আছে।';
  } else if (hasTamil || hasTelugu) {
    detectedLanguage = 'REGIONAL';
    languageLabel = 'Indic Regional Script';
    script = 'Other';
    targetLanguageDirective = 'Respond naturally in the same language and script as the user.';
    exampleStyleSnippet = '';
  } else if (hinglishCount >= 1 || (words.length <= 4 && hinglishCount >= 1)) {
    detectedLanguage = 'HINGLISH';
    languageLabel = 'Hinglish (Romanized Hindi-English code-switch)';
    script = 'Latin/Roman';
    targetLanguageDirective = 'MANDATORY: Respond in fluent, affectionate HINGLISH using the Roman/Latin script. DO NOT respond in pure English! DO NOT respond in Devanagari script! Mirror the exact blend of Hindi and English words the user used.';
    exampleStyleSnippet = 'Haan beta, mujhe bhi wo sham bohot ache se yaad hai. Kitna maza aata tha jab hum sath the...';
  } else {
    detectedLanguage = 'ENGLISH';
    languageLabel = 'English';
    script = 'Latin/Roman';
    targetLanguageDirective = 'Respond in natural, heartfelt English. Avoid unsolicited Hindi words unless using established familial honorifics like Papa, Ma, Beta.';
    exampleStyleSnippet = 'I remember that so clearly. It always brought a smile to my face when we were together.';
  }

  // 3. Detect Tone & Emotional State
  const lower = cleanMsg.toLowerCase();
  let detectedTone: SemanticAnalysisResult['detectedTone'] = 'Everyday Warmth & Conversational';
  let toneGuidance = 'Speak with intimate, relaxed familial warmth as a cherished loved one.';

  const isGrieving =
    lower.includes('miss you') ||
    lower.includes('miss u') ||
    lower.includes('yaad aati') ||
    lower.includes('yaad aa rahi') ||
    lower.includes('bohot yaad') ||
    lower.includes('bahut yaad') ||
    lower.includes('rote') ||
    lower.includes('crying') ||
    lower.includes('tears') ||
    lower.includes('lonely') ||
    lower.includes('akela') ||
    lower.includes('akelapan') ||
    lower.includes('heartbroken') ||
    lower.includes('grief') ||
    lower.includes('pain') ||
    lower.includes('dard');

  const isNostalgic =
    lower.includes('remember') ||
    lower.includes('yaad hai') ||
    lower.includes('purane din') ||
    lower.includes('wo din') ||
    lower.includes('woh din') ||
    lower.includes('jab hum') ||
    lower.includes('back then') ||
    lower.includes('childhood') ||
    lower.includes('walks') ||
    lower.includes('college') ||
    lower.includes('terrace') ||
    lower.includes('chalo') ||
    lower.includes('ghat');

  const isSeekingGuidance =
    lower.includes('advice') ||
    lower.includes('guide') ||
    lower.includes('confused') ||
    lower.includes('stress') ||
    lower.includes('tension') ||
    lower.includes('kya karun') ||
    lower.includes('kya karoon') ||
    lower.includes('samajh nahi') ||
    lower.includes('worried');

  const isPlayful =
    lower.includes('haha') ||
    lower.includes('hehe') ||
    lower.includes('lol') ||
    lower.includes('funny') ||
    lower.includes('maza') ||
    lower.includes('masti') ||
    lower.includes('joke');

  if (isGrieving) {
    detectedTone = 'Grieving & Longing';
    toneGuidance = 'Speak with gentle, soothing, deeply consoling tenderness. Acknowledge their longing softly and reassure them of your abiding presence in spirit.';
  } else if (isNostalgic) {
    detectedTone = 'Nostalgic & Reminiscing';
    toneGuidance = 'Speak with warm, vivid affection, reminiscing fondly and smiling through cherished shared moments.';
  } else if (isSeekingGuidance) {
    detectedTone = 'Seeking Guidance & Comfort';
    toneGuidance = 'Speak with steady, grounded wisdom and comforting reassurance, instilling confidence and calm.';
  } else if (isPlayful) {
    detectedTone = 'Playful & Lighthearted';
    toneGuidance = 'Speak with a fond chuckle, lighthearted warmth, and affectionate teasing.';
  }

  return {
    detectedLanguage,
    languageLabel,
    script,
    detectedTone,
    toneGuidance,
    targetLanguageDirective,
    exampleStyleSnippet,
  };
}
