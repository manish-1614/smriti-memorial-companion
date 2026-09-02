'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MemorialProfile, MemorialMemory, ChatMessage, ConversationSession } from '@/lib/types';
import {
  fetchConversations,
  createConversationSession,
  fetchMessages,
  saveChatMessage,
  saveMemory,
} from '@/lib/firestore-service';
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
} from 'lucide-react';

interface CompanionChatProps {
  userId: string;
  profile: MemorialProfile;
  memories: MemorialMemory[];
  onBack: () => void;
  onOpenMemoryTab: () => void;
  onMemoryAdded?: () => void;
}

export default function CompanionChat({
  userId,
  profile,
  memories,
  onBack,
  onOpenMemoryTab,
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
          // Create default first session
          const newSession = await createConversationSession(
            userId,
            profile.id,
            `Remembering ${profile.name}`
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
      const title = `Conversation ${conversations.length + 1}`;
      const newSession = await createConversationSession(userId, profile.id, title);
      setConversations([newSession, ...conversations]);
      setActiveSession(newSession);
      setMessages([]);
      setShowHistorySidebar(false);
    } catch (err) {
      console.error('Failed to create new session:', err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || sending || !activeSession) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Save user message to Firestore
    try {
      const userMsgRecord = await saveChatMessage(userId, profile.id, activeSession.id, {
        role: 'user',
        content: userText,
      });
      setMessages((prev) => [...prev, userMsgRecord]);

      // Call server-side chat API route with memory embeddings & grounding context
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      // Background Semantic Memory Distillation
      // Check if user's input contains a real memory/anecdote to save into the member's permanent memory vault
      (async () => {
        try {
          const extractRes = await fetch('/api/memories/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userMessage: userText,
              assistantReply: reply,
              profileName: profile.name,
              relationship: profile.relationship,
              existingMemories: memories.map((m) => ({ title: m.title, story: m.story })),
            }),
          });

          if (extractRes.ok) {
            const extractData = await extractRes.json();
            if (extractData.eligible && extractData.memory) {
              const newMem = await saveMemory(userId, profile.id, {
                title: extractData.memory.title,
                story: extractData.memory.story,
                category: extractData.memory.category || 'anecdote',
                tags: extractData.memory.tags || ['conversation'],
                embedding: extractData.memory.embedding || undefined,
              });

              setSavedMemoryNotice({
                title: newMem.title,
                story: newMem.story,
              });

              if (onMemoryAdded) {
                onMemoryAdded();
              }

              // Auto-dismiss the notice after 6 seconds
              setTimeout(() => {
                setSavedMemoryNotice((current) => (current?.title === newMem.title ? null : current));
              }, 6000);
            }
          }
        } catch (memExtractErr) {
          console.warn('Silent memory extraction check:', memExtractErr);
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
              <button
                key={conv.id}
                onClick={() => {
                  setActiveSession(conv);
                  setShowHistorySidebar(false);
                }}
                className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white border border-[#7D8F69]/40 text-[#4A443F] shadow-xs'
                    : 'bg-white/40 hover:bg-white/80 text-[#8C7B6E] border border-transparent'
                }`}
              >
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
              </button>
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
    </div>
  );
}
