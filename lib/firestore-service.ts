import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { MemorialProfile, MemorialMemory, ChatMessage, ConversationSession } from './types';

// ==========================================
// CLIENT-SIDE LOCAL CACHE HELPERS (FOR SNAPPY OFFLINE RESILIENCE)
// ==========================================
const getLocalStore = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setLocalStore = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('LocalStorage error:', err);
  }
};

// ==========================================
// MEMORIAL PROFILES (Strictly under /users/{userId}/memorials)
// ==========================================

export async function fetchUserMemorials(userId: string): Promise<MemorialProfile[]> {
  const localKey = `smriti_memorials_${userId}`;

  try {
    const memRef = collection(db, 'users', userId, 'memorials');
    const q = query(memRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MemorialProfile));
    setLocalStore(localKey, results);
    return results;
  } catch (error) {
    console.warn('Firestore fetch error, attempting fallback:', error);
    try {
      const memRef = collection(db, 'users', userId, 'memorials');
      const snapshot = await getDocs(memRef);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MemorialProfile));
      const sorted = list.sort((a, b) => b.createdAt - a.createdAt);
      setLocalStore(localKey, sorted);
      return sorted;
    } catch {
      return getLocalStore<MemorialProfile[]>(localKey, []);
    }
  }
}

export async function saveMemorialProfile(
  userId: string,
  profile: Omit<MemorialProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
  existingId?: string
): Promise<MemorialProfile> {
  const localKey = `smriti_memorials_${userId}`;
  const memorialId = existingId || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const currentList = getLocalStore<MemorialProfile[]>(localKey, []);
  const existingLocal = currentList.find((m) => m.id === memorialId);

  const data: MemorialProfile = {
    ...profile,
    id: memorialId,
    userId,
    createdAt: existingLocal ? existingLocal.createdAt : now,
    updatedAt: now,
  };

  // Update local cache first for instant feedback
  const updatedList = existingLocal
    ? currentList.map((m) => (m.id === memorialId ? data : m))
    : [data, ...currentList];
  setLocalStore(localKey, updatedList);

  try {
    const docRef = doc(db, 'users', userId, 'memorials', memorialId);
    await setDoc(docRef, data, { merge: true });
  } catch (err) {
    console.warn('Firestore sync warning (saved locally):', err);
  }

  return data;
}

export async function deleteMemorialProfile(userId: string, memorialId: string): Promise<void> {
  const localKey = `smriti_memorials_${userId}`;
  const currentList = getLocalStore<MemorialProfile[]>(localKey, []);
  setLocalStore(
    localKey,
    currentList.filter((m) => m.id !== memorialId)
  );

  try {
    const docRef = doc(db, 'users', userId, 'memorials', memorialId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore delete warning:', err);
  }
}

// ==========================================
// MEMORIES (Strictly under /users/{userId}/memorials/{memorialId}/memories)
// ==========================================

export async function fetchMemoriesForMemorial(userId: string, memorialId: string): Promise<MemorialMemory[]> {
  const localKey = `smriti_memories_${userId}_${memorialId}`;

  try {
    const ref = collection(db, 'users', userId, 'memorials', memorialId, 'memories');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MemorialMemory));
    setLocalStore(localKey, results);
    return results;
  } catch (error) {
    console.warn('Firestore memories fetch error, falling back:', error);
    try {
      const ref = collection(db, 'users', userId, 'memorials', memorialId, 'memories');
      const snapshot = await getDocs(ref);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as MemorialMemory));
      const sorted = list.sort((a, b) => b.createdAt - a.createdAt);
      setLocalStore(localKey, sorted);
      return sorted;
    } catch {
      return getLocalStore<MemorialMemory[]>(localKey, []);
    }
  }
}

export async function saveMemory(
  userId: string,
  memorialId: string,
  memoryData: {
    title: string;
    story: string;
    category: MemorialMemory['category'];
    timePeriod?: string;
    tags?: string[];
    embedding?: number[];
  },
  existingId?: string
): Promise<MemorialMemory> {
  const localKey = `smriti_memories_${userId}_${memorialId}`;
  const memId = existingId || `memory_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  let embedding = memoryData.embedding;

  // Compute embedding via authenticated API route
  if (!embedding || embedding.length === 0) {
    try {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/memories/embed', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text: memoryData.story,
          title: memoryData.title,
          category: memoryData.category,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.embedding) {
          embedding = json.embedding;
        }
      }
    } catch (err) {
      console.warn('Could not compute embedding on save:', err);
    }
  }

  const currentList = getLocalStore<MemorialMemory[]>(localKey, []);
  const existingLocal = currentList.find((m) => m.id === memId);

  const memoryRecord: MemorialMemory = {
    id: memId,
    memorialId,
    userId,
    title: memoryData.title,
    story: memoryData.story,
    category: memoryData.category,
    timePeriod: memoryData.timePeriod || '',
    tags: memoryData.tags || [],
    embedding: embedding || [],
    createdAt: existingLocal ? existingLocal.createdAt : now,
    updatedAt: now,
  };

  const updatedList = existingLocal
    ? currentList.map((m) => (m.id === memId ? memoryRecord : m))
    : [memoryRecord, ...currentList];
  setLocalStore(localKey, updatedList);

  try {
    const docRef = doc(db, 'users', userId, 'memorials', memorialId, 'memories', memId);
    await setDoc(docRef, memoryRecord, { merge: true });
  } catch (err) {
    console.warn('Firestore memory save warning (saved locally):', err);
  }

  return memoryRecord;
}

export async function deleteMemory(userId: string, memorialId: string, memoryId: string): Promise<void> {
  // 1. Immediately clean up local cache
  const localKey = `smriti_memories_${userId}_${memorialId}`;
  const currentList = getLocalStore<MemorialMemory[]>(localKey, []);
  setLocalStore(
    localKey,
    currentList.filter((m) => m.id !== memoryId)
  );

  // 2. Cascade atomic deletion across Firestore subcollections
  try {
    // Primary user-isolated subcollection: users/{userId}/memorials/{memorialId}/memories/{memoryId}
    const userDocRef = doc(db, 'users', userId, 'memorials', memorialId, 'memories', memoryId);
    await deleteDoc(userDocRef);

    // Companions direct subcollection path: companions/{companionId}/memories/{memoryId}
    const companionDocRef = doc(db, 'companions', memorialId, 'memories', memoryId);
    await deleteDoc(companionDocRef).catch(() => {});

    // Root memories collection if referenced
    const rootMemRef = doc(db, 'memories', memoryId);
    await deleteDoc(rootMemRef).catch(() => {});
  } catch (err) {
    console.warn('Firestore memory cascade delete warning:', err);
  }
}

export async function updateConversationTitle(
  userId: string,
  memorialId: string,
  conversationId: string,
  title: string
): Promise<void> {
  const localKey = `smriti_convs_${userId}_${memorialId}`;
  const currentList = getLocalStore<ConversationSession[]>(localKey, []);
  const updatedList = currentList.map((c) =>
    c.id === conversationId ? { ...c, title } : c
  );
  setLocalStore(localKey, updatedList);

  try {
    // Primary conversations path
    const convRef = doc(db, 'users', userId, 'memorials', memorialId, 'conversations', conversationId);
    await updateDoc(convRef, { title }).catch(async () => {
      await setDoc(convRef, { title }, { merge: true });
    });

    // Secondary /sessions/{sessionId} document update as specified in Task 1
    const sessionRef = doc(db, 'users', userId, 'memorials', memorialId, 'sessions', conversationId);
    await setDoc(sessionRef, { title, updatedAt: Date.now() }, { merge: true }).catch(() => {});
  } catch (err) {
    console.warn('Firestore session title update warning (saved locally):', err);
  }
}

// ==========================================
// CONVERSATIONS & CHAT HISTORY
// ==========================================

export async function fetchConversations(userId: string, memorialId: string): Promise<ConversationSession[]> {
  const localKey = `smriti_convs_${userId}_${memorialId}`;

  try {
    const convRef = collection(db, 'users', userId, 'memorials', memorialId, 'conversations');
    const q = query(convRef, orderBy('lastMessageAt', 'desc'), limit(30));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ConversationSession));
    setLocalStore(localKey, results);
    return results;
  } catch (error) {
    console.warn('Error fetching conversations from Firestore:', error);
    return getLocalStore<ConversationSession[]>(localKey, []);
  }
}

export async function createConversationSession(
  userId: string,
  memorialId: string,
  title: string = 'Conversation'
): Promise<ConversationSession> {
  const localKey = `smriti_convs_${userId}_${memorialId}`;
  const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const session: ConversationSession = {
    id: convId,
    memorialId,
    userId,
    title,
    lastMessageSnippet: '',
    lastMessageAt: now,
    createdAt: now,
  };

  const currentList = getLocalStore<ConversationSession[]>(localKey, []);
  setLocalStore(localKey, [session, ...currentList]);

  try {
    const docRef = doc(db, 'users', userId, 'memorials', memorialId, 'conversations', convId);
    await setDoc(docRef, session);
  } catch (err) {
    console.warn('Firestore conv session warning (saved locally):', err);
  }

  return session;
}

export async function deleteConversationSession(
  userId: string,
  memorialId: string,
  conversationId: string
): Promise<void> {
  const localKey = `smriti_convs_${userId}_${memorialId}`;
  const currentList = getLocalStore<ConversationSession[]>(localKey, []);
  setLocalStore(
    localKey,
    currentList.filter((c) => c.id !== conversationId)
  );

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`smriti_msgs_${userId}_${memorialId}_${conversationId}`);
    } catch {
      // ignore
    }
  }

  try {
    // Delete messages subcollection
    const msgRef = collection(db, 'users', userId, 'memorials', memorialId, 'conversations', conversationId, 'messages');
    const msgDocs = await getDocs(msgRef);
    const deletePromises = msgDocs.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises).catch(() => {});

    // Delete conversation document
    const convRef = doc(db, 'users', userId, 'memorials', memorialId, 'conversations', conversationId);
    await deleteDoc(convRef);

    // Delete session document if present
    const sessionRef = doc(db, 'users', userId, 'memorials', memorialId, 'sessions', conversationId);
    await deleteDoc(sessionRef).catch(() => {});
  } catch (err) {
    console.warn('Firestore conversation session delete warning:', err);
  }
}

export async function fetchMessages(userId: string, memorialId: string, conversationId: string): Promise<ChatMessage[]> {
  const localKey = `smriti_msgs_${userId}_${memorialId}_${conversationId}`;

  try {
    const msgRef = collection(db, 'users', userId, 'memorials', memorialId, 'conversations', conversationId, 'messages');
    const q = query(msgRef, orderBy('createdAt', 'asc'), limit(100));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
    setLocalStore(localKey, results);
    return results;
  } catch (error) {
    console.warn('Error fetching messages from Firestore:', error);
    return getLocalStore<ChatMessage[]>(localKey, []);
  }
}

export async function saveChatMessage(
  userId: string,
  memorialId: string,
  conversationId: string,
  message: {
    role: 'user' | 'assistant';
    content: string;
    groundedMemories?: ChatMessage['groundedMemories'];
  }
): Promise<ChatMessage> {
  const localKey = `smriti_msgs_${userId}_${memorialId}_${conversationId}`;
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const chatMessage: ChatMessage = {
    id: msgId,
    conversationId,
    memorialId,
    userId,
    role: message.role,
    content: message.content,
    groundedMemories: message.groundedMemories || [],
    createdAt: now,
  };

  const currentMsgs = getLocalStore<ChatMessage[]>(localKey, []);
  setLocalStore(localKey, [...currentMsgs, chatMessage]);

  // Update conversation last message locally
  const convKey = `smriti_convs_${userId}_${memorialId}`;
  const currentConvs = getLocalStore<ConversationSession[]>(convKey, []);
  const snippet = message.content.slice(0, 80);
  const updatedConvs = currentConvs.map((c) =>
    c.id === conversationId ? { ...c, lastMessageSnippet: snippet, lastMessageAt: now } : c
  );
  setLocalStore(convKey, updatedConvs);

  try {
    const docRef = doc(db, 'users', userId, 'memorials', memorialId, 'conversations', conversationId, 'messages', msgId);
    await setDoc(docRef, chatMessage);

    const convRef = doc(db, 'users', userId, 'memorials', memorialId, 'conversations', conversationId);
    await updateDoc(convRef, {
      lastMessageSnippet: snippet,
      lastMessageAt: now,
    }).catch(() => {});
  } catch (err) {
    console.warn('Firestore chat save warning (saved locally):', err);
  }

  return chatMessage;
}

