'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MemorialProfile, MemorialMemory, ChatMessage, ConversationSession } from '@/lib/types';
import { auth } from '@/lib/firebase';
import {
  fetchConversations,
  createConversationSession,
  fetchMessages,
  saveChatMessage,
  saveMemory,
  updateConversationTitle,
  deleteConversationSession,
} from '@/lib/firestore-service';
import MemoryModal from '@/components/memory-modal';
import {
  Send,
  Sparkles,
  MessageSquare,
  Plus,
  ArrowLeft,
  BookOpen,
  Info,
  Clock,
  History,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  BookmarkPlus,
  CheckCircle2,
  Edit2,
  Scroll,
  Lightbulb,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface ProposedMemory {
  id: string;
  title: string;
  story: string;
  category: MemorialMemory['category'];
  tags: string[];
  embedding?: number[] | null;
  messageId: string;
}

interface CompanionChatProps {
  userId: string;
  profile: MemorialProfile;
  memories: MemorialMemory[];
  onBack: () => void;
  onOpenMemoryTab: () => void;
  onEditProfileClick?: (profile: MemorialProfile) => void;
  onGenerateLetterClick?: () => void;
  onMemoryAdded?: () => void;
}

export default function CompanionChat({
  userId,
  profile,
  memories,
  onBack,
  onOpenMemoryTab,
  onEditProfileClick,
  onGenerateLetterClick,
  onMemoryAdded,
}: CompanionChatProps) {
  const [conversations, setConversations] = useState<ConversationSession[]>([]);
  const [activeSession, setActiveSession] = useState<ConversationSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);
  const [expandedGroundingId, setExpandedGroundingId] = useState<string | null>(null);
  const [savedMemoryNotice, setSavedMemoryNotice] = useState<{ title: string; story: string } | null>(null);

  // Gated Memory Proposal States
  const [proposedMemory, setProposedMemory] = useState<ProposedMemory | null>(null);
  const [isSavingProposed, setIsSavingProposed] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [memoryToEdit, setMemoryToEdit] = useState<MemorialMemory | null>(null);

  // Conversation Deletion States
  const [conversationToDelete, setConversationToDelete] = useState<ConversationSession | null>(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load existing conversation sessions or create initial one
  useEffect(() => {
    let mounted = true;

    async function initConversations() {
      setLoadingHistory(true);
      try {
        const list = await fetchConversations(userId, profile.id);
        if (!mounted) return;

        setConversations(list);
        if (list.length > 0) {
          setActiveSession(list[0]);
        } else {
          // Create default first session without hardcoded counter
          const newSession = await createConversationSession(
            userId,
            profile.id,
            'New Conversation'
          );
          if (mounted) {
            setConversations([newSession]);
            setActiveSession(newSession);
          }
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    }

    initConversations();

    return () => {
      mounted = false;
    };
  }, [userId, profile.id, profile.name]);

  // Load messages when active session changes
  useEffect(() => {
    let mounted = true;
    if (!activeSession) return;

    async function loadSessionMessages() {
      try {
        const msgs = await fetchMessages(userId, profile.id, activeSession!.id);
        if (mounted) {
          setMessages(msgs);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    }

    loadSessionMessages();

    return () => {
      mounted = false;
    };
  }, [userId, profile.id, activeSession]);

  // Scroll to bottom of message list on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleStartNewConversation = async () => {
    try {
      // Remove sequential counters like 'Conversation N'
      const title = 'New Conversation';
      const newSession = await createConversationSession(userId, profile.id, title);
      setConversations([newSession, ...conversations]);
      setActiveSession(newSession);
      setMessages([]);
      setProposedMemory(null);
      setShowHistorySidebar(false);
    } catch (err) {
      console.error('Failed to create new session:', err);
    }
  };

  // Handler for explicit consent-based memory persistence
  const handleSaveProposedMemory = async (proposal: ProposedMemory) => {
    setIsSavingProposed(true);
    try {
      const saved = await saveMemory(userId, profile.id, {
        title: proposal.title,
        story: proposal.story,
        category: proposal.category,
        tags: proposal.tags,
        embedding: proposal.embedding || undefined,
      });

      setSavedMemoryNotice({
        title: saved.title,
        story: saved.story,
      });

      if (onMemoryAdded) {
        onMemoryAdded();
      }

      setProposedMemory(null);

      setTimeout(() => {
        setSavedMemoryNotice((current) => (current?.title === saved.title ? null : current));
      }, 5000);
    } catch (err) {
      console.error('Failed to save proposed memory:', err);
    } finally {
      setIsSavingProposed(false);
    }
  };

  const handleOpenEditProposedMemory = (proposal: ProposedMemory) => {
    setMemoryToEdit({
      id: '',
      memorialId: profile.id,
      userId,
      title: proposal.title,
      story: proposal.story,
      category: proposal.category,
      tags: proposal.tags,
      timePeriod: '',
      createdAt: 0,
      updatedAt: 0,
      embedding: proposal.embedding || undefined,
    });
    setIsMemoryModalOpen(true);
  };

  const handleSaveFromModal = async (data: {
    title: string;
    story: string;
    category: MemorialMemory['category'];
    timePeriod?: string;
    tags?: string[];
  }) => {
    try {
      const saved = await saveMemory(userId, profile.id, {
        title: data.title,
        story: data.story,
        category: data.category,
        timePeriod: data.timePeriod,
        tags: data.tags,
        embedding: memoryToEdit?.embedding,
      });

      setSavedMemoryNotice({
        title: saved.title,
        story: saved.story,
      });

      if (onMemoryAdded) {
        onMemoryAdded();
      }

      setProposedMemory(null);
      setIsMemoryModalOpen(false);
      setMemoryToEdit(null);

      setTimeout(() => {
        setSavedMemoryNotice((current) => (current?.title === saved.title ? null : current));
      }, 5000);
    } catch (err) {
      console.error('Failed to save memory from modal:', err);
    }
  };

  // Delete conversation session from Firestore and state while preserving all memories in the vault
  const handleDeleteConversationConfirm = async () => {
    if (!conversationToDelete) return;
    setIsDeletingConversation(true);

    try {
      const targetId = conversationToDelete.id;
      // Atomic deletion of the conversation session and its chat messages (memories remain untouched)
      await deleteConversationSession(userId, profile.id, targetId);

      const remaining = conversations.filter((c) => c.id !== targetId);
      setConversations(remaining);

      // If active session was deleted, switch to next available or create a fresh new session
      if (activeSession?.id === targetId) {
        if (remaining.length > 0) {
          setActiveSession(remaining[0]);
        } else {
          const fresh = await createConversationSession(userId, profile.id, 'New Conversation');
          setConversations([fresh]);
          setActiveSession(fresh);
        }
      }

      setConversationToDelete(null);
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    } finally {
      setIsDeletingConversation(false);
    }
  };

  // Context-aware title generation based on reasoning over the actual conversation transcript
  const triggerContextualTitleReasoning = async (
    currentSessionId: string,
    historyTurns: Array<{ role: 'user' | 'assistant'; content: string }>,
    forceReasoning: boolean = false
  ) => {
    try {
      const session = conversations.find((c) => c.id === currentSessionId) || activeSession;
      if (!session) return;

      const isGeneric =
        !session.title ||
        session.title === 'New Conversation' ||
        session.title === 'Conversation' ||
        /^Conversation\s+\d+$/i.test(session.title) ||
        session.title === `Remembering ${profile.name}` ||
        session.title.toLowerCase().startsWith('warm greeting') ||
        session.title.toLowerCase().startsWith('catching up') ||
        session.title.toLowerCase().startsWith('hello');

      // If title is already specific and distinct, do not overwrite after turn 4 unless forced
      if (!isGeneric && !forceReasoning && historyTurns.length > 4) {
        return;
      }

      const freshIdToken = await auth.currentUser?.getIdToken();
      const titleRes = await fetch('/api/chat/title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(freshIdToken ? { Authorization: `Bearer ${freshIdToken}` } : {}),
        },
        body: JSON.stringify({
          conversationHistory: historyTurns.slice(-8),
          profileName: profile.name,
          currentTitle: session.title,
        }),
      });

      if (titleRes.ok) {
        const titleData = await titleRes.json();
        if (titleData.title && typeof titleData.title === 'string') {
          const generatedTitle = titleData.title.trim();
          if (generatedTitle && generatedTitle !== session.title) {
            setActiveSession((prev) =>
              prev?.id === currentSessionId ? { ...prev, title: generatedTitle } : prev
            );
            setConversations((prev) =>
              prev.map((c) => (c.id === currentSessionId ? { ...c, title: generatedTitle } : c))
            );
            await updateConversationTitle(userId, profile.id, currentSessionId, generatedTitle);
          }
        }
      }
    } catch (titleErr) {
      console.warn('Background contextual session title reasoning error:', titleErr);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || sending || !activeSession) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Trigger contextual title reasoning on the first message or if title is generic
    const currentTurnsWithUser = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: userText },
    ];
    triggerContextualTitleReasoning(activeSession.id, currentTurnsWithUser, false);

    // Save user message to Firestore
    try {
      const userMsgRecord = await saveChatMessage(userId, profile.id, activeSession.id, {
        role: 'user',
        content: userText,
      });
      setMessages((prev) => [...prev, userMsgRecord]);

      // Obtain fresh Firebase ID token
      const idToken = await auth.currentUser?.getIdToken();
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      };

      // Call server-side chat API route with memory embeddings & grounding context
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          profile,
          memories,
          message: userText,
          conversationHistory: messages.slice(-8).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      let data: { reply?: string; groundedMemories?: ChatMessage['groundedMemories']; error?: string } = {};
      const responseText = await chatRes.text();
      try {
        data = JSON.parse(responseText);
      } catch {
        // If server returned non-JSON error page (e.g. 502/504 gateway or html error)
        throw new Error(`Server returned status ${chatRes.status}: ${responseText.slice(0, 150)}`);
      }

      if (!chatRes.ok || !data.reply) {
        throw new Error(data.error || `Failed to generate companion response (${chatRes.status})`);
      }

      const { reply, groundedMemories } = data;

      // Save assistant response to Firestore
      const assistantMsgRecord = await saveChatMessage(userId, profile.id, activeSession.id, {
        role: 'assistant',
        content: reply,
        groundedMemories,
      });

      setMessages((prev) => [...prev, assistantMsgRecord]);

      // Re-reason title as the conversation context solidifies in early turns (turns 1-3)
      if (messages.filter((m) => m.role === 'user').length <= 3) {
        const fullTurns = [
          ...currentTurnsWithUser,
          { role: 'assistant' as const, content: reply },
        ];
        triggerContextualTitleReasoning(activeSession.id, fullTurns, false);
      }

      // Task 2: Background Semantic Memory Extraction (Gated / Proposal Only)
      // Conversational dialogue must NEVER silently auto-commit a new document to /memories
      (async () => {
        try {
          const extractRes = await fetch('/api/memories/extract', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              userMessage: userText,
              assistantReply: reply,
              profileName: profile.name,
              relationship: profile.relationship,
              existingMemories: (memories || []).map((m) => ({
                title: m.title || 'Untitled Memory',
                story: m.story || m.content || '',
              })),
            }),
          });

          if (extractRes.ok) {
            const extractData = await extractRes.json();
            if (extractData.eligible && extractData.memory) {
              // Set proposal state for user consent; do NOT auto-persist to Firestore
              setProposedMemory({
                id: `prop_${Date.now()}`,
                title: extractData.memory.title,
                story: extractData.memory.story,
                category: extractData.memory.category || 'anecdote',
                tags: extractData.memory.tags || ['conversation'],
                embedding: extractData.memory.embedding || null,
                messageId: assistantMsgRecord.id,
              });
            }
          }
        } catch (memExtractErr) {
          console.warn('Silent memory extraction proposal check:', memExtractErr);
        }
      })();
    } catch (error: unknown) {
      console.error('Error in chat exchange:', error);
      const errMsg = error instanceof Error ? error.message : 'An error occurred during response generation.';
      const fallbackMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        conversationId: activeSession.id,
        memorialId: profile.id,
        userId,
        role: 'assistant',
        content: `I'm holding this moment with you, but I encountered an issue accessing my memories right now: ${errMsg}`,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] max-w-7xl mx-auto w-full bg-[#FAF8F5] border border-[#E5E0D5] rounded-3xl overflow-hidden shadow-sm">
      {/* Sidebar: Conversation Sessions & Past History */}
      <div
        className={`${
          showHistorySidebar ? 'flex' : 'hidden'
        } md:flex flex-col w-72 border-r border-[#E5E0D5] bg-[#F5F1E9] p-4 shrink-0 transition-all z-20`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E0D5]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#7D8F69]" />
            <h3 className="text-xs font-serif font-bold tracking-wider text-[#4A443F]">
              Past Dialogues
            </h3>
          </div>
          <button
            id="start-new-chat-btn"
            onClick={handleStartNewConversation}
            className="px-2.5 py-1 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
            title="Start New Conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-3 space-y-1.5 pr-1">
          {conversations.map((conv) => {
            const isActive = activeSession?.id === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => {
                  setActiveSession(conv);
                  setShowHistorySidebar(false);
                }}
                className={`group relative w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white border border-[#7D8F69]/40 text-[#4A443F] shadow-xs'
                    : 'bg-white/40 hover:bg-white/80 text-[#8C7B6E] border border-transparent'
                }`}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-xs font-semibold truncate text-[#4A443F]">
                    {conv.title || 'Conversation'}
                  </div>
                  <div className="text-[11px] text-[#8C7B6E] truncate mt-1">
                    {conv.lastMessageSnippet || 'No messages yet...'}
                  </div>
                  <div className="text-[10px] text-[#A69F95] mt-1 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {new Date(conv.lastMessageAt || conv.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                <button
                  id={`delete-conv-btn-${conv.id}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConversationToDelete(conv);
                  }}
                  className="opacity-80 sm:opacity-0 group-hover:opacity-100 p-1.5 rounded-xl text-[#A69F95] hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer shrink-0"
                  title="Delete this conversation (memories in vault remain preserved)"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-[#E5E0D5]">
          <button
            onClick={onOpenMemoryTab}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-[#F5F1E9] text-[#4A443F] text-xs font-medium border border-[#E5E0D5] cursor-pointer shadow-xs transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#7D8F69]" />
            View {memories.length} Stored Memories
          </button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col bg-[#FDFBF7] overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E0D5] bg-white/90 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-[#8C7B6E] hover:text-[#4A443F] hover:bg-[#F5F1E9] transition-colors cursor-pointer"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-2xl bg-[#F5F1E9] border border-[#E5E0D5] flex items-center justify-center overflow-hidden shrink-0">
              {profile.avatarType === 'emoji' ? (
                <span className="text-xl">{profile.avatarValue}</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarValue} alt={profile.name} className="w-full h-full object-cover" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-serif font-bold text-[#4A443F]">{profile.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F0EBE0] text-[#8C7B6E] border border-[#E5E0D5]">
                  {profile.relationship}
                </span>
                {onEditProfileClick && (
                  <button
                    onClick={() => onEditProfileClick(profile)}
                    className="p-1 rounded-lg text-[#8C7B6E] hover:text-[#4A443F] hover:bg-[#E5E0D5]/50 transition-colors cursor-pointer"
                    title="Edit Companion Profile"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#8C7B6E]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#7D8F69] animate-pulse" />
                <span>Companion grounded in {memories.length} vector memories</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistorySidebar(!showHistorySidebar)}
              className="md:hidden p-2 rounded-xl bg-white text-[#4A443F] border border-[#E5E0D5]"
              title="History"
            >
              <History className="w-4 h-4" />
            </button>
            {onGenerateLetterClick && (
              <button
                id="generate-letter-chat-header-btn"
                onClick={onGenerateLetterClick}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F5F1E9] text-[#4A443F] text-xs font-medium border border-[#E5E0D5] cursor-pointer shadow-xs transition-colors"
                title="Generate a heartfelt letter from this companion"
              >
                <Scroll className="w-3.5 h-3.5 text-[#7D8F69]" />
                Letter From Them
              </button>
            )}
            <button
              onClick={onOpenMemoryTab}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F5F1E9] text-[#4A443F] text-xs font-medium border border-[#E5E0D5] cursor-pointer shadow-xs transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#7D8F69]" />
              Manage Memories ({memories.length})
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
          {memories.length === 0 && messages.length === 0 && !loadingHistory && (
            <div className="p-4 rounded-2xl bg-[#7D8F69]/10 border border-[#7D8F69]/20 text-[#4A443F] text-xs flex items-start gap-3">
              <Info className="w-4 h-4 text-[#7D8F69] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-serif font-bold text-[#7D8F69]">No memories recorded yet</div>
                <p className="text-[#8C7B6E]">
                  To make your companion deeply reflective and authentically grounded, add quotes, anecdotes, and stories about {profile.name} in the Memory section.
                </p>
                <button
                  onClick={onOpenMemoryTab}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white font-medium cursor-pointer shadow-xs"
                >
                  <Plus className="w-3 h-3" />
                  Add First Memory
                </button>
              </div>
            </div>
          )}

          {messages.length === 0 && !loadingHistory && (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#8C7B6E] space-y-4 my-auto">
              <div className="w-16 h-16 rounded-3xl bg-[#F5F1E9] border border-[#E5E0D5] flex items-center justify-center text-2xl shadow-inner">
                {profile.avatarType === 'emoji' ? profile.avatarValue : '🕊️'}
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-serif font-bold text-[#4A443F]">
                  Begin a conversation with {profile.name}&apos;s memorial companion
                </h3>
                <p className="text-xs text-[#8C7B6E]">
                  Ask questions, reminisce about favorite memories, or simply share what&apos;s on your mind. Every response will traceably draw upon your recorded stories.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-2 max-w-lg">
                {[
                  `What was your favorite memory with me?`,
                  `Tell me a story you used to love telling.`,
                  `What advice would you give me today?`,
                  `What are some simple things you loved in life?`,
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInputMessage(prompt);
                      textareaRef.current?.focus();
                    }}
                    className="px-3 py-1.5 rounded-full bg-white hover:bg-[#F5F1E9] text-[#4A443F] text-xs border border-[#E5E0D5] transition-colors cursor-pointer shadow-xs"
                  >
                    &ldquo;{prompt}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const hasGrounding = msg.groundedMemories && msg.groundedMemories.length > 0;
            const isGroundingOpen = expandedGroundingId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border text-xs ${
                    isUser
                      ? 'bg-[#8C7B6E] border-[#E5E0D5] text-white'
                      : 'bg-[#7D8F69]/10 border-[#7D8F69]/30 text-[#7D8F69]'
                  }`}
                >
                  {isUser ? (
                    'You'
                  ) : profile.avatarType === 'emoji' ? (
                    profile.avatarValue
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarValue} alt="Companion" className="w-full h-full object-cover rounded-xl" />
                  )}
                </div>

                {/* Content Bubble */}
                <div
                  className={`flex flex-col space-y-1.5 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-[#7D8F69] text-white font-normal rounded-tr-xs shadow-xs'
                        : 'bg-white text-[#4A443F] border border-[#E5E0D5] rounded-tl-xs shadow-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {/* Grounded Memories Traceability Pill */}
                  {!isUser && hasGrounding && (
                    <div className="w-full">
                      <button
                        onClick={() => setExpandedGroundingId(isGroundingOpen ? null : msg.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#7D8F69]/10 hover:bg-[#7D8F69]/20 text-[11px] text-[#7D8F69] border border-[#7D8F69]/20 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3 h-3 text-[#7D8F69]" />
                        <span>Grounded in {msg.groundedMemories!.length} stored memories</span>
                        {isGroundingOpen ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {isGroundingOpen && (
                        <div className="mt-2 p-3.5 rounded-2xl bg-white border border-[#E5E0D5] shadow-xs space-y-2 text-xs text-[#4A443F]">
                          <div className="font-serif font-bold text-[#7D8F69] text-[11px] tracking-wider uppercase">
                            Retrieved Memory Anchors (Vector Similarity)
                          </div>
                          <div className="space-y-1.5">
                            {msg.groundedMemories!.map((gm, i) => (
                              <div
                                key={i}
                                className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5E0D5] space-y-0.5"
                              >
                                <div className="flex items-center justify-between font-medium text-[#7D8F69] text-[11px]">
                                  <span>{gm.title || 'Recorded Memory'}</span>
                                  {gm.similarityScore && (
                                    <span className="text-[#8C7B6E] text-[10px]">
                                      {(gm.similarityScore * 100).toFixed(0)}% match
                                    </span>
                                  )}
                                </div>
                                <p className="text-[#8C7B6E] text-[11px] line-clamp-2 leading-relaxed">
                                  {gm.snippet}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Task 2: Explicit Memory Proposal (UI Gate) */}
                  {!isUser && proposedMemory && proposedMemory.messageId === msg.id && (
                    <div
                      id={`proposed-memory-card-${proposedMemory.id}`}
                      className="w-full mt-2 p-3.5 rounded-2xl bg-[#F5EFE6] border border-[#E0D8C8] text-[#4A443F] shadow-xs space-y-2.5 animate-in fade-in slide-in-from-top-1"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-[#7D8F69]/20 text-[#7D8F69] flex items-center justify-center shrink-0 mt-0.5">
                          <Lightbulb className="w-3.5 h-3.5 text-[#7D8F69]" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="text-xs font-serif font-bold text-[#4A443F]">
                            Save this as a permanent memory for {profile.name}?
                          </div>
                          <div className="p-2.5 rounded-xl bg-white/90 border border-[#E5E0D5] text-[11px] space-y-0.5">
                            <span className="font-semibold text-[#7D8F69] block">{proposedMemory.title}</span>
                            <span className="text-[#6E645C] block leading-relaxed">{proposedMemory.story}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#E0D8C8]/60">
                        <button
                          id="dismiss-proposed-memory-btn"
                          type="button"
                          onClick={() => setProposedMemory(null)}
                          disabled={isSavingProposed}
                          className="px-2.5 py-1 rounded-full text-xs text-[#8C7B6E] hover:text-[#4A443F] hover:bg-black/5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                        <button
                          id="review-proposed-memory-btn"
                          type="button"
                          onClick={() => handleOpenEditProposedMemory(proposedMemory)}
                          disabled={isSavingProposed}
                          className="px-3 py-1 rounded-full border border-[#D5CFBF] bg-white hover:bg-[#FAF8F5] text-xs font-medium text-[#4A443F] inline-flex items-center gap-1 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <Edit2 className="w-3 h-3 text-[#8C7B6E]" />
                          Review / Edit
                        </button>
                        <button
                          id="confirm-save-proposed-memory-btn"
                          type="button"
                          onClick={() => handleSaveProposedMemory(proposedMemory)}
                          disabled={isSavingProposed}
                          className="px-3.5 py-1 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white text-xs font-medium inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isSavingProposed ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="w-3.5 h-3.5" />
                              Save Memory
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <span className="text-[10px] text-[#A69F95] px-1">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })}

          {sending && (
            <div className="flex gap-3 max-w-3xl mr-auto">
              <div className="w-8 h-8 rounded-xl bg-[#7D8F69]/10 border border-[#7D8F69]/30 flex items-center justify-center shrink-0 text-[#7D8F69] text-xs">
                {profile.avatarType === 'emoji' ? profile.avatarValue : '🕊️'}
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-xs bg-white border border-[#E5E0D5] text-[#4A443F] text-sm flex items-center gap-2 shadow-xs">
                <Sparkles className="w-4 h-4 text-[#7D8F69] animate-spin" />
                <span className="text-xs text-[#8C7B6E]">
                  Retrieving memories & forming thoughtful response...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[#E5E0D5] bg-white/95 backdrop-blur-xs relative">
          {/* Automatic Semantic Memory Distillation Notification Banner */}
          {savedMemoryNotice && (
            <div className="max-w-4xl mx-auto mb-3 p-3 rounded-2xl bg-[#7D8F69]/10 border border-[#7D8F69]/25 flex items-center justify-between gap-3 text-xs text-[#4A443F] shadow-xs animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-[#7D8F69] text-white flex items-center justify-center shrink-0">
                  <BookmarkPlus className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-[#7D8F69]">Story preserved: </span>
                  <span className="font-medium text-[#4A443F]">{savedMemoryNotice.title}</span>
                  <span className="text-[#8C7B6E] ml-1.5 hidden sm:inline">
                    (Added to {profile.name}&apos;s memory vault with vector embedding)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSavedMemoryNotice(null)}
                className="text-[#8C7B6E] hover:text-[#4A443F] px-2 py-0.5 rounded-md hover:bg-[#7D8F69]/10 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 max-w-4xl mx-auto">
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                id="companion-chat-input"
                rows={2}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${profile.name}'s memorial companion... (Enter to send, Shift+Enter for new line)`}
                className="w-full pl-4 pr-12 py-3 rounded-2xl bg-[#FAF8F5] border border-[#E5E0D5] text-[#4A443F] placeholder-[#A69F95] focus:outline-hidden focus:ring-2 focus:ring-[#7D8F69]/30 text-sm resize-none"
              />
            </div>

            <button
              id="send-companion-message-btn"
              type="submit"
              disabled={!inputMessage.trim() || sending}
              className="p-3.5 rounded-2xl bg-[#7D8F69] hover:bg-[#6E7E5B] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#7D8F69]/15 shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[11px] text-[#A69F95]">
              Responses are anchored in your stored memories to celebrate and reflect their authentic presence.
            </span>
          </div>
        </div>
      </div>

      {/* Memory Review / Edit Modal for Gated Proposal */}
      {isMemoryModalOpen && (
        <MemoryModal
          isOpen={isMemoryModalOpen}
          onClose={() => {
            setIsMemoryModalOpen(false);
            setMemoryToEdit(null);
          }}
          onSave={handleSaveFromModal}
          initialData={memoryToEdit}
          selectedMemory={memoryToEdit}
          memorialName={profile.name}
        />
      )}

      {/* Delete Conversation Confirmation Modal */}
      {conversationToDelete && (
        <div
          id="delete-conversation-modal"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-[#FDFBF7] border border-[#E5E0D5] rounded-3xl max-w-md w-full p-6 shadow-xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200/60 flex items-center justify-center shrink-0 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-serif font-bold text-[#4A443F]">
                  Delete Conversation
                </h3>
                <p className="text-xs text-[#8C7B6E]">
                  Are you sure you want to delete <span className="font-semibold text-[#4A443F]">&ldquo;{conversationToDelete.title || 'this conversation'}&rdquo;</span>?
                </p>
              </div>
            </div>

            {/* Prominent reassurance regarding memories preservation */}
            <div className="p-3.5 rounded-2xl bg-[#7D8F69]/10 border border-[#7D8F69]/20 flex items-start gap-2.5 text-xs text-[#4A443F]">
              <ShieldCheck className="w-4 h-4 text-[#7D8F69] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <span className="font-semibold text-[#5A6949]">Memories Vault Untouched:</span> Deleting this dialogue removes only the chat exchange. All memories saved, referenced, or created in {profile.name}&apos;s memory vault remain completely intact and preserved.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E5E0D5]/70">
              <button
                type="button"
                id="cancel-delete-conv-btn"
                onClick={() => setConversationToDelete(null)}
                disabled={isDeletingConversation}
                className="px-4 py-2 rounded-xl bg-white hover:bg-[#F5F1E9] text-[#4A443F] text-xs font-medium border border-[#E5E0D5] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-conv-btn"
                onClick={handleDeleteConversationConfirm}
                disabled={isDeletingConversation}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingConversation ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Dialogue</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
