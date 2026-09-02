'use client';

import React, { useState } from 'react';
import { MemorialProfile } from '@/lib/types';
import { X, Sparkles, Upload, Heart, User } from 'lucide-react';

interface MemorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Omit<MemorialProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>, id?: string) => Promise<void>;
  initialData?: MemorialProfile | null;
}

const EMOJI_OPTIONS = ['🕊️', '🌸', '🕯️', '🌿', '✨', '🌻', '🤍', '🌙', '🌷', '🌊', '📖', '🍵', '🎨', '🌟', '🕊'];
const SUGGESTED_TRAITS = ['Warm & Encouraging', 'Gentle & Patient', 'Witty & Playful', 'Wise & Philosophical', 'Passionate Storyteller', 'Thoughtful Listener', 'Quiet Strength', 'Generous & Hospitable'];

export default function MemorialModal({ isOpen, onClose, onSave, initialData }: MemorialModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [relationship, setRelationship] = useState(initialData?.relationship || '');
  const [avatarType, setAvatarType] = useState<'emoji' | 'image'>(initialData?.avatarType || 'emoji');
  const [avatarValue, setAvatarValue] = useState(initialData?.avatarValue || '🕊️');
  const [selectedTraits, setSelectedTraits] = useState<string[]>(initialData?.personalityTraits || ['Warm & Encouraging']);
  const [customTrait, setCustomTrait] = useState('');
  const [toneDescription, setToneDescription] = useState(initialData?.toneDescription || '');
  const [birthYear, setBirthYear] = useState(initialData?.birthYear || '');
  const [passedYear, setPassedYear] = useState(initialData?.passedYear || '');
  const [bioSnippet, setBioSnippet] = useState(initialData?.bioSnippet || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTraitToggle = (trait: string) => {
    if (selectedTraits.includes(trait)) {
      setSelectedTraits(selectedTraits.filter((t) => t !== trait));
    } else {
      if (selectedTraits.length < 5) {
        setSelectedTraits([...selectedTraits, trait]);
      }
    }
  };

  const handleAddCustomTrait = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTrait.trim() && !selectedTraits.includes(customTrait.trim())) {
      if (selectedTraits.length < 5) {
        setSelectedTraits([...selectedTraits, customTrait.trim()]);
        setCustomTrait('');
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 800 * 1024) {
      setError('Image must be under 800KB. Please select a smaller photo.');
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarValue(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for this memorial profile.');
      return;
    }
    if (!relationship.trim()) {
      setError('Please specify your relationship (e.g. Grandmother, Father, Mentor, Friend).');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(
        {
          name: name.trim(),
          relationship: relationship.trim(),
          avatarType,
          avatarValue: avatarValue.trim() || '🕊️',
          personalityTraits: selectedTraits,
          toneDescription: toneDescription.trim(),
          birthYear: birthYear.trim(),
          passedYear: passedYear.trim(),
          bioSnippet: bioSnippet.trim(),
        },
        initialData?.id
      );
      onClose();
    } catch (err: unknown) {
      console.error('Failed to save profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save memorial profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 sm:p-6">
      <div
        id="memorial-modal-container"
        className="w-full max-w-2xl bg-[#FDFBF7] border border-[#E5E0D5] rounded-3xl shadow-2xl text-[#4A443F] my-auto max-h-[90vh] flex flex-col overflow-hidden font-sans"
      >
        <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-[#E5E0D5] bg-[#FDFBF7] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#7D8F69]/10 border border-[#7D8F69]/20 text-[#7D8F69]">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-bold tracking-tight text-[#4A443F]">
                {initialData ? 'Edit Memorial Profile' : 'Create Memorial Profile'}
              </h2>
              <p className="text-xs text-[#8C7B6E] mt-0.5">
                Record the cherished persona and essence of your loved one.
              </p>
            </div>
          </div>
          <button
            id="close-memorial-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-[#8C7B6E] hover:text-[#4A443F] hover:bg-[#F5F1E9] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
          {error && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7B6E]">
              Memorial Avatar (Static Photo or Symbol)
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#F5F1E9] border border-[#E5E0D5] flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {avatarType === 'emoji' ? (
                  <span className="text-3xl select-none">{avatarValue || '🕊️'}</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarValue} alt="Avatar" className="w-full h-full object-cover" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarType('emoji');
                      if (!EMOJI_OPTIONS.includes(avatarValue)) setAvatarValue('🕊️');
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                      avatarType === 'emoji'
                        ? 'bg-[#7D8F69] text-white border-[#7D8F69]'
                        : 'bg-white text-[#8C7B6E] border-[#E5E0D5] hover:bg-[#F5F1E9]'
                    }`}
                  >
                    Emoji Symbol
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvatarType('image')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                      avatarType === 'image'
                        ? 'bg-[#7D8F69] text-white border-[#7D8F69]'
                        : 'bg-white text-[#8C7B6E] border-[#E5E0D5] hover:bg-[#F5F1E9]'
                    }`}
                  >
                    Upload Photo
                  </button>
                </div>

                {avatarType === 'emoji' ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {EMOJI_OPTIONS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setAvatarValue(em)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all cursor-pointer ${
                          avatarValue === em
                            ? 'bg-[#7D8F69]/20 ring-2 ring-[#7D8F69] scale-105'
                            : 'bg-[#F5F1E9] hover:bg-[#E5E0D5] text-[#4A443F]'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="photo-upload-input"
                      className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#F5F1E9] text-[#4A443F] border border-[#E5E0D5] text-xs font-medium transition-colors shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#7D8F69]" />
                      Select Photo
                    </label>
                    <input
                      id="photo-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <span className="text-xs text-[#8C7B6E]">JPG, PNG (max 800KB)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Name & Relationship */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7B6E] mb-1.5">
                Loved One&apos;s Name *
              </label>
              <input
                id="memorial-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Eleanor Vance, Grandpa Joe"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#E5E0D5] text-[#4A443F] placeholder-[#A69F95] focus:outline-hidden focus:ring-2 focus:ring-[#7D8F69]/30 text-sm shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7B6E] mb-1.5">
                Relationship to You *
              </label>
              <input
                id="memorial-relationship-input"
                type="text"
                required
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. Grandmother, Father, Dear Friend, Mentor"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#E5E0D5] text-[#4A443F] placeholder-[#A69F95] focus:outline-hidden focus:ring-2 focus:ring-[#7D8F69]/30 text-sm shadow-xs"
              />
            </div>
          </div>

          {/* Years / Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7B6E] mb-1.5">
                Birth Year (Optional)
              </label>
              <input
                type="text"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder="e.g. 1942"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#E5E0D5] text-[#4A443F] placeholder-[#A69F95] focus:outline-hidden focus:ring-2 focus:ring-[#7D8F69]/30 text-sm shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7B6E] mb-1.5">
                Passed Year (Optional)
              </label>
              <input
                type="text"
                value={passedYear}
                onChange={(e) => setPassedYear(e.target.value)}
                placeholder="e.g. 2021"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#E5E0D5] text-[#4A443F] placeholder-[#A69F95] focus:outline-hidden focus:ring-2 focus:ring-[#7D8F69]/30 text-sm shadow-xs"
              />
            </div>
          </div>

          {/* Personality Traits */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7B6E]">
              Core Personality Traits (Up to 5)
            </label>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TRAITS.map((trait) => {
                const active = selectedTraits.includes(trait);
                return (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => handleTraitToggle(trait)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? 'bg-[#7D8F69] text-white shadow-xs'
                        : 'bg-white text-[#8C7B6E] border border-[#E5E0D5] hover:bg-[#F5F1E9]'
                    }`}
                  >
                    {trait}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={customTrait}
                onChange={(e) => setCustomTrait(e.target.value)}
                placeholder="Add custom trait..."
                className="flex-1 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E0D5] text-[#4A443F] placeholder-[#A69F95] text-xs focus:outline-hidden focus:ring-1 focus:ring-[#7D8F69]/30"
              />
              <button
                type="button"
                onClick={handleAddCustomTrait}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#F5F1E9] text-[#4A443F] text-xs font-medium border border-[#E5E0D5] cursor-pointer"
              >
                + Add
              </button>
            </div>
          </div>

          {/* Tone Guidance */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7B6E] mb-1.5">
              Voice & Tone Nuance (Optional)
            </label>
            <input
              type="text"
              value={toneDescription}
              onChange={(e) => setToneDescription(e.target.value)}
              placeholder="e.g. Always greeted me with 'Hey kiddo', soft-spoken, loved dry humor, gentle cadence"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#E5E0D5] text-[#4A443F] placeholder-[#A69F95] focus:outline-hidden focus:ring-2 focus:ring-[#7D8F69]/30 text-sm shadow-xs"
            />
          </div>

          {/* Bio / Life summary */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#8C7B6E] mb-1.5">
              Brief Life Summary / Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={bioSnippet}
              onChange={(e) => setBioSnippet(e.target.value)}
              placeholder="e.g. Born in rural Vermont, worked as a high school librarian for 35 years, avid gardener and lover of jazz."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-[#E5E0D5] text-[#4A443F] placeholder-[#A69F95] focus:outline-hidden focus:ring-2 focus:ring-[#7D8F69]/30 text-sm resize-none shadow-xs"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#E5E0D5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-[#8C7B6E] hover:text-[#4A443F] text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-memorial-profile-btn"
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white font-medium text-sm transition-all shadow-md shadow-[#7D8F69]/20 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
            >
              {saving ? (
                <>Saving Profile...</>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {initialData ? 'Save Changes' : 'Create Memorial'}
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
