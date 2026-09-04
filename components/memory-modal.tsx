'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import React, { useState, useEffect } from 'react';
import { MemorialMemory } from '@/lib/types';
import { X, BookmarkPlus, Sparkles, Tag, Calendar } from 'lucide-react';

export interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    data: {
      title: string;
      story: string;
      category: MemorialMemory['category'];
      timePeriod?: string;
      tags?: string[];
    },
    existingId?: string
  ) => Promise<void>;
  initialData?: MemorialMemory | null;
  selectedMemory?: MemorialMemory | null;
  memorialName?: string;
}

const CATEGORIES: { id: MemorialMemory['category']; label: string; description: string }[] = [
  { id: 'anecdote', label: 'Anecdote / Story', description: 'A memorable event or story that illustrates who they were' },
  { id: 'quote', label: 'Favorite Saying / Quote', description: 'Phrases, jokes, or words of wisdom they frequently shared' },
  { id: 'lesson', label: 'Life Lesson / Advice', description: 'Guidance or values they passed on to you' },
  { id: 'habit', label: 'Habit / Routine', description: 'Quirks, morning routines, or beloved traditions' },
  { id: 'favorite', label: 'Favorite Thing', description: 'Books, songs, dishes, places, or pastimes they loved' },
  { id: 'milestone', label: 'Key Milestone', description: 'Major life events, triumphs, or shared milestones' },
];

export default function MemoryModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  selectedMemory,
  memorialName = 'Companion',
}: MemoryModalProps) {
  // Disambiguate active memory object between selectedMemory and initialData
  const activeMemory = selectedMemory !== undefined ? selectedMemory : initialData;

  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [category, setCategory] = useState<MemorialMemory['category']>('anecdote');
  const [timePeriod, setTimePeriod] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to reset all form fields to default clean slate
  const resetFormState = () => {
    setTitle('');
    setStory('');
    setCategory('anecdote');
    setTimePeriod('');
    setTagInput('');
    setTags([]);
    setError(null);
    setSaving(false);
  };

  // State isolation: synchronize or reset on modal open/close or memory selection changes
  useEffect(() => {
    if (!isOpen) return;

    if (activeMemory && activeMemory.id) {
      // EDIT MODE: Pre-populate all fields with existing document values
      setTitle(activeMemory.title || '');
      setStory(activeMemory.story || activeMemory.content || '');
      setCategory(
        (activeMemory.category || activeMemory.classification || 'anecdote') as MemorialMemory['category']
      );
      setTimePeriod(activeMemory.timePeriod || activeMemory.approximateYear || '');

      // Normalize existing tags to clean strings without leading hashes
      if (Array.isArray(activeMemory.tags)) {
        const cleaned = activeMemory.tags
          .map((t) => t.trim().replace(/^#+/, '').trim())
          .filter(Boolean);
        // Deduplicate
        const uniqueSet = new Set<string>();
        const deduped: string[] = [];
        for (const t of cleaned) {
          const lower = t.toLowerCase();
          if (!uniqueSet.has(lower)) {
            uniqueSet.add(lower);
            deduped.push(t);
          }
        }
        setTags(deduped);
      } else {
        setTags([]);
      }
      setTagInput('');
      setError(null);
    } else {
      // CREATE MODE: Fresh clean slate
      resetFormState();
    }
  }, [isOpen, activeMemory]);

  const handleClose = () => {
    resetFormState();
    onClose();
  };

  if (!isOpen) return null;

  /**
   * Multi-tag parser:
   * Splits raw input by comma or whitespace, strips leading '#', trims,
   * ignores empty items, and deduplicates against current tags.
   */
  const parseAndAddTags = (rawInput: string) => {
    if (!rawInput.trim()) return;

    // Split input using regex: input.split(/[, ]+/)
    const rawSegments = rawInput.split(/[, ]+/);
    const existingLowerSet = new Set(tags.map((t) => t.toLowerCase()));
    const newTags: string[] = [];

    for (const seg of rawSegments) {
      // Strip leading '#' symbols so tags store consistently without duplication
      const cleaned = seg.trim().replace(/^#+/, '').trim();
      if (!cleaned) continue;

      const lower = cleaned.toLowerCase();
      if (!existingLowerSet.has(lower)) {
        existingLowerSet.add(lower);
        newTags.push(cleaned);
      }
    }

    if (newTags.length > 0) {
      setTags((prev) => [...prev, ...newTags]);
    }
    setTagInput('');
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      parseAndAddTags(tagInput);
    }
  };

  const handleTagInputBlur = () => {
    if (tagInput.trim()) {
      parseAndAddTags(tagInput);
    }
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Intercept immediate comma entry
    if (val.includes(',')) {
      parseAndAddTags(val);
    } else {
      setTagInput(val);
    }
  };

  const handleTagInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted && /[, ]/.test(pasted)) {
      e.preventDefault();
      parseAndAddTags(pasted);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Flush any pending tag in the tag input before saving
    if (tagInput.trim()) {
      parseAndAddTags(tagInput);
    }

    if (!title.trim()) {
      setError('Please provide a title for this memory.');
      return;
    }
    if (!story.trim()) {
      setError('Please write the memory or anecdote story.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(
        {
          title: title.trim(),
          story: story.trim(),
          category,
          timePeriod: timePeriod.trim(),
          tags,
        },
        activeMemory?.id
      );
      handleClose();
    } catch (err: unknown) {
      console.error('Failed to save memory:', err);
      setError(err instanceof Error ? err.message : 'Failed to save memory.');
    } finally {
      setSaving(false);
    }
  };

  const isEditMode = Boolean(activeMemory && activeMemory.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 sm:p-6">
      <div
        id="memory-modal-container"
        className="w-full max-w-2xl bg-[#FDFBF7] border border-[#E5E0D5] rounded-3xl shadow-2xl text-[#4A443F] my-auto max-h-[90vh] flex flex-col overflow-hidden font-sans"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-[#E5E0D5] bg-[#FDFBF7] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#7D8F69]/10 border border-[#7D8F69]/20 text-[#7D8F69]">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold tracking-tight text-[#4A443F]">
                {isEditMode ? 'Edit Memory' : `Add Memory for ${memorialName}`}
              </h2>
              <p className="text-xs text-[#8C7B6E] mt-0.5">
                Every memory is transformed into semantic embeddings to authentically ground your companion.
              </p>
            </div>
          </div>
          <button
            id="close-memory-modal-btn"
            onClick={handleClose}
            className="p-2 rounded-xl text-[#8C7B6E] hover:text-[#4A443F] hover:bg-[#F5F1E9] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7B6E] mb-1.5">
                Memory Title / Hook *
              </label>
              <input
                id="memory-title-input"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sunday Morning Blueberry Pancakes, The Old Blue Truck Journey"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#E5E0D5] text-[#4A443F] placeholder-[#A69F95] focus:outline-hidden focus:ring-2 focus:ring-[#7D8F69]/30 text-sm shadow-xs"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7B6E] mb-2">
                Memory Classification
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#7D8F69] text-white border-[#7D8F69] shadow-xs'
                          : 'bg-white border-[#E5E0D5] text-[#8C7B6E] hover:bg-[#F5F1E9] hover:text-[#4A443F]'
                      }`}
                    >
                      <div className="text-xs font-medium">{cat.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Story Content */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7B6E]">
                  Detailed Story / Anecdote / Words *
                </label>
                <span className="text-xs text-[#A69F95]">{story.length} / 4000 chars</span>
              </div>
              <textarea
                id="memory-story-input"
                rows={6}
                required
                maxLength={4000}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Describe what happened, what was said, the setting, or the emotional significance. E.g.: 'Every summer Sunday, she would wake up at 6 AM to make buttermilk blueberry pancakes. She insisted on adding a dash of cinnamon and would always let the batter rest for 10 minutes...'"
                className="w-full px-3.5 py-3 rounded-2xl bg-white border border-[#E5E0D5] text-[#4A443F] placeholder-[#A69F95] focus:outline-hidden focus:ring-2 focus:ring-[#7D8F69]/30 text-sm resize-none leading-relaxed shadow-xs"
              />
            </div>

            {/* Time period & Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7B6E] mb-1.5">
                  Time Period / Approximate Year (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(e.target.value)}
                    placeholder="e.g. Summer 1998, College Years, Christmas 2012"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-white border border-[#E5E0D5] text-[#4A443F] placeholder-[#A69F95] focus:outline-hidden focus:ring-2 focus:ring-[#7D8F69]/30 text-sm shadow-xs"
                  />
                  <Calendar className="w-4 h-4 absolute left-3 top-3 text-[#A69F95]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7B6E] mb-1.5">
                  Tags (Separated by comma or spaces, e.g. #familyjokes, #sweets)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="memory-tag-input"
                      type="text"
                      value={tagInput}
                      onChange={handleTagInputChange}
                      onKeyDown={handleTagInputKeyDown}
                      onBlur={handleTagInputBlur}
                      onPaste={handleTagInputPaste}
                      placeholder="e.g. #familyjokes, #sweets, #lunchtime"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-white border border-[#E5E0D5] text-[#4A443F] placeholder-[#A69F95] focus:outline-hidden focus:ring-2 focus:ring-[#7D8F69]/30 text-sm shadow-xs"
                    />
                    <Tag className="w-4 h-4 absolute left-3 top-3 text-[#A69F95]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => parseAndAddTags(tagInput)}
                    className="px-4 py-2 rounded-full bg-white hover:bg-[#F5F1E9] text-[#4A443F] text-xs font-medium border border-[#E5E0D5] cursor-pointer shadow-xs transition-colors"
                  >
                    Add
                  </button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {tags.map((t) => {
                      const cleanDisplayTag = t.replace(/^#+/, '');
                      return (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F0EBE0] text-[#7D8F69] text-xs font-medium border border-[#E5E0D5]"
                        >
                          #{cleanDisplayTag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(t)}
                            aria-label={`Remove tag ${cleanDisplayTag}`}
                            className="hover:text-rose-600 font-bold ml-0.5 cursor-pointer"
                          >
                            &times;
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#E5E0D5]">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-full text-[#8C7B6E] hover:text-[#4A443F] text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-memory-btn"
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white font-medium text-sm transition-all shadow-md shadow-[#7D8F69]/20 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <>Embedding &amp; Saving...</>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {isEditMode ? 'Update Memory' : 'Save & Embed Memory'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export { MemoryModal as AddMemoryModal, MemoryModal as EditMemoryModal };
