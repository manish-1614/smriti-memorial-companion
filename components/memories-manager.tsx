'use client';

import React, { useState } from 'react';
import { MemorialMemory, MemorialProfile } from '@/lib/types';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  Sparkles,
  BookOpen,
  ArrowLeft,
  MessageSquare,
  Tag,
  CheckCircle,
  Scroll,
} from 'lucide-react';

interface MemoriesManagerProps {
  userId: string;
  profile: MemorialProfile;
  memories: MemorialMemory[];
  onAddMemoryClick: () => void;
  onEditMemoryClick: (memory: MemorialMemory) => void;
  onEditProfileClick?: (profile: MemorialProfile) => void;
  onGenerateLetterClick?: () => void;
  onDeleteMemory: (memoryId: string) => Promise<void>;
  onOpenChat: () => void;
  onBackToDashboard: () => void;
}

export default function MemoriesManager({
  userId,
  profile,
  memories,
  onAddMemoryClick,
  onEditMemoryClick,
  onEditProfileClick,
  onGenerateLetterClick,
  onDeleteMemory,
  onOpenChat,
  onBackToDashboard,
}: MemoriesManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [memoryToDelete, setMemoryToDelete] = useState<MemorialMemory | null>(null);

  const filteredMemories = memories.filter((mem) => {
    if (!mem) return false;
    const cat = mem.category || mem.classification || 'anecdote';
    const matchesCategory = categoryFilter === 'all' || cat === categoryFilter;
    const q = searchQuery.toLowerCase().trim();
    if (!matchesCategory) return false;
    if (!q) return true;

    const titleText = (mem.title || '').toLowerCase();
    const storyText = (mem.story || mem.content || '').toLowerCase();
    const tagsMatch =
      Array.isArray(mem.tags) &&
      mem.tags.some((t) => typeof t === 'string' && t.toLowerCase().includes(q));
    const timeMatch = (mem.timePeriod || mem.approximateYear || '').toLowerCase().includes(q);

    return titleText.includes(q) || storyText.includes(q) || tagsMatch || timeMatch;
  });

  const confirmDelete = async () => {
    if (!memoryToDelete) return;
    const memId = memoryToDelete.id;
    setDeletingId(memId);
    try {
      await onDeleteMemory(memId);
      setMemoryToDelete(null);
    } catch (err) {
      console.error('Failed to delete memory:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 font-sans">
      {/* Header & Profile Summary */}
      <div className="p-6 md:p-8 rounded-3xl bg-linear-to-b from-[#F5F1E9] via-[#FAF8F5] to-[#FDFBF7] border border-[#E5E0D5] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="p-2.5 rounded-xl text-[#8C7B6E] hover:text-[#4A443F] hover:bg-[#E5E0D5]/50 transition-colors cursor-pointer"
            title="Back to Memorials"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-[#F5F1E9] border border-[#E5E0D5] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
            {profile.avatarType === 'emoji' ? (
              <span className="text-3xl">{profile.avatarValue}</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarValue} alt={profile.name} className="w-full h-full object-cover" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-[#4A443F]">{profile.name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#7D8F69]/10 border border-[#7D8F69]/20 text-[#7D8F69] font-medium">
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
            <p className="text-xs text-[#8C7B6E] mt-1">
              Memory Collection &bull; {memories.length} stories recorded
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onGenerateLetterClick && (
            <button
              id="generate-letter-from-memories-btn"
              onClick={onGenerateLetterClick}
              className="px-4 py-2.5 rounded-full bg-white hover:bg-[#F5F1E9] text-[#4A443F] text-xs font-medium border border-[#E5E0D5] inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            >
              <Scroll className="w-4 h-4 text-[#7D8F69]" />
              Generate a Letter
            </button>
          )}
          <button
            id="start-chat-from-memories-btn"
            onClick={onOpenChat}
            className="px-4 py-2.5 rounded-full bg-white hover:bg-[#F5F1E9] text-[#4A443F] text-xs font-medium border border-[#E5E0D5] inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <MessageSquare className="w-4 h-4 text-[#7D8F69]" />
            Open Companion Chat
          </button>
          <button
            id="add-memory-button"
            onClick={onAddMemoryClick}
            className="px-5 py-2.5 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-[#7D8F69]/20"
          >
            <Plus className="w-4 h-4" />
            Add New Memory
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories by keyword, quote, topic, or date..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-[#E5E0D5] text-[#4A443F] placeholder-[#A69F95] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#7D8F69]/30 shadow-xs"
          />
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#A69F95]" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-[#8C7B6E] flex items-center gap-1 pl-1">
            <Filter className="w-3.5 h-3.5" />
          </span>
          {['all', 'anecdote', 'quote', 'lesson', 'habit', 'favorite', 'milestone'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize shrink-0 transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#7D8F69] text-white shadow-xs'
                  : 'bg-white text-[#8C7B6E] border border-[#E5E0D5] hover:bg-[#F5F1E9]'
              }`}
            >
              {cat === 'all' ? 'All Memories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Cards Grid */}
      {filteredMemories.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-[#E5E0D5] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F1E9] flex items-center justify-center mx-auto text-[#7D8F69]">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-serif font-bold text-[#4A443F]">
              {searchQuery || categoryFilter !== 'all' ? 'No matching memories found' : 'No memories recorded yet'}
            </h3>
            <p className="text-xs text-[#8C7B6E]">
              {searchQuery || categoryFilter !== 'all'
                ? 'Try clearing your filters or searching for different keywords.'
                : 'Start building a rich, grounded memorial collection by capturing stories, sayings, routines, and life lessons.'}
            </p>
          </div>
          {!searchQuery && categoryFilter === 'all' && (
            <button
              onClick={onAddMemoryClick}
              className="mt-2 px-5 py-2.5 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white font-medium text-xs inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add First Memory
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMemories.map((mem) => {
            const hasEmbedding = mem.embedding && mem.embedding.length > 0;
            return (
              <div
                key={mem.id}
                className="p-5 rounded-3xl bg-white border border-[#E5E0D5] hover:border-[#7D8F69]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4 shadow-xs group"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-[#F0EBE0] text-[#7D8F69] border border-[#E5E0D5]">
                        {mem.category || mem.classification || 'anecdote'}
                      </span>
                      <h3 className="text-base font-serif font-bold text-[#4A443F] mt-2">
                        {mem.title || 'Untitled Memory'}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditMemoryClick(mem)}
                        className="p-1.5 rounded-lg text-[#8C7B6E] hover:text-[#4A443F] hover:bg-[#F5F1E9] transition-colors cursor-pointer"
                        title="Edit Memory"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`delete-memory-btn-${mem.id}`}
                        onClick={() => setMemoryToDelete(mem)}
                        disabled={deletingId === mem.id}
                        className="p-1.5 rounded-lg text-[#8C7B6E] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete Memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#4A443F] leading-relaxed whitespace-pre-wrap line-clamp-6">
                    {mem.story || mem.content || 'No memory details recorded.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E5E0D5] flex items-center justify-between text-[11px] text-[#8C7B6E]">
                  <div className="flex items-center gap-2">
                    {(mem.timePeriod || mem.approximateYear) && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#A69F95]" />
                        {mem.timePeriod || mem.approximateYear}
                      </span>
                    )}

                    {hasEmbedding ? (
                      <span className="inline-flex items-center gap-1 text-[#7D8F69] font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Vector Indexed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#8C7B6E]">
                        <Sparkles className="w-3 h-3" />
                        Text Mode
                      </span>
                    )}
                  </div>

                  {mem.tags && mem.tags.length > 0 && (
                    <div className="flex items-center gap-1 overflow-hidden">
                      {mem.tags.slice(0, 2).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-[#F0EBE0] text-[10px] text-[#8C7B6E] border border-[#E5E0D5] truncate max-w-[80px]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-App Delete Confirmation Modal (Iframe-Safe) */}
      {memoryToDelete && (
        <div
          id="delete-memory-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        >
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E5E0D5] shadow-xl space-y-4 font-sans animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-serif font-bold text-[#4A443F]">Delete Memory</h3>
                <p className="text-xs text-[#8C7B6E] leading-relaxed">
                  Are you sure you want to delete &ldquo;
                  <span className="font-semibold text-[#4A443F]">
                    {memoryToDelete.title || 'this memory'}
                  </span>
                  &rdquo;? This will permanently remove it from {profile.name}&apos;s memory vault.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E0D5]">
              <button
                type="button"
                id="cancel-delete-memory-btn"
                onClick={() => setMemoryToDelete(null)}
                disabled={deletingId === memoryToDelete.id}
                className="px-4 py-2 rounded-full border border-[#E5E0D5] text-[#4A443F] hover:bg-[#F5F1E9] text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-memory-btn"
                onClick={confirmDelete}
                disabled={deletingId === memoryToDelete.id}
                className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
              >
                {deletingId === memoryToDelete.id ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Memory
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
