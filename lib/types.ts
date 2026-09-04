export interface MemorialProfile {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  relation?: string;
  avatarType: 'emoji' | 'image';
  avatarValue: string; // emoji character or base64 image data / photo URL
  avatarUrl?: string;
  personalityTraits: string[];
  personalitySeed?: string;
  toneDescription?: string;
  voiceConfig?: string;
  primaryLanguage?: string;
  birthYear?: string;
  passedYear?: string;
  yearOfPassing?: string;
  bioSnippet?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MemorialMemory {
  id: string;
  memorialId: string;
  userId: string;
  title: string;
  story: string;
  content?: string; // alias for story
  category: 'anecdote' | 'quote' | 'lesson' | 'habit' | 'favorite' | 'milestone';
  classification?: string; // alias for category
  timePeriod?: string;
  approximateYear?: string; // alias for timePeriod
  tags?: string[];
  embedding?: number[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  memorialId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  groundedMemories?: {
    id: string;
    title: string;
    snippet: string;
    similarityScore?: number;
  }[];
  createdAt: number;
}

export interface ConversationSession {
  id: string;
  memorialId: string;
  userId: string;
  title: string;
  lastMessageSnippet: string;
  lastMessageAt: number;
  createdAt: number;
}
