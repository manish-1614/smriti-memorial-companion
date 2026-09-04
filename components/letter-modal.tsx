'use client';

import React, { useState, useEffect } from 'react';
import { MemorialProfile, MemorialMemory } from '@/lib/types';
import { auth } from '@/lib/firebase';
import {
  X,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Scroll,
  Heart,
  AlertCircle,
} from 'lucide-react';

interface LetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: MemorialProfile | null;
  memories?: MemorialMemory[];
}

export default function LetterModal({
  isOpen,
  onClose,
  profile,
  memories = [],
}: LetterModalProps) {
  const [loading, setLoading] = useState(false);
  const [letter, setLetter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [memoryCount, setMemoryCount] = useState<number>(0);

  const fetchLetter = async (isMountedRef = { current: true }) => {
    if (!profile) return;
    setLoading(true);
    setError(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/memories/letter', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          profileId: profile.id,
          profile,
          memories,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate letter (status ${res.status})`);
      }

      const data = await res.json();
      if (isMountedRef.current) {
        setLetter(data.letter);
        setMemoryCount(data.memoryCount ?? memories.length);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        console.error('Error generating letter:', err);
        setError(err instanceof Error ? err.message : 'Unable to generate letter. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleClose = () => {
    setLetter(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  // Trigger generation asynchronously when the modal is opened
  useEffect(() => {
    if (!isOpen || !profile) return;
    const isMountedRef = { current: true };

    // Defer to next tick to avoid synchronous setState warning during mount
    const timer = setTimeout(() => {
      if (isMountedRef.current) {
        fetchLetter(isMountedRef);
      }
    }, 0);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, profile?.id]);

  const handleCopy = async () => {
    if (!letter) return;
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handleDownload = () => {
    if (!letter || !profile) return;
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const fileContent = `A LETTER FROM ${profile.name.toUpperCase()}
Relationship: ${profile.relationship}
Date: ${dateStr}
------------------------------------------------------------

${letter}

------------------------------------------------------------
Preserved with Smriti — Grounded in ${memoryCount} cherished memories.
`;

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = profile.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.href = url;
    link.download = `${safeName}_Letter.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen || !profile) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 sm:p-6">
      <div
        id="letter-modal-container"
        className="w-full max-w-2xl bg-[#FDFBF7] border border-[#E5E0D5] rounded-3xl shadow-2xl text-[#4A443F] my-auto max-h-[92vh] flex flex-col overflow-hidden font-sans"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-[#E5E0D5] bg-[#FDFBF7] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7D8F69]/10 border border-[#7D8F69]/20 flex items-center justify-center overflow-hidden shrink-0 text-xl">
              {profile.avatarType === 'emoji' ? (
                <span>{profile.avatarValue}</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarValue}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold tracking-tight text-[#4A443F]">
                  Letter From {profile.name}
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#7D8F69]/10 text-[#7D8F69] font-medium border border-[#7D8F69]/20">
                  {profile.relationship}
                </span>
              </div>
              <p className="text-xs text-[#8C7B6E] mt-0.5">
                Synthesized from {memories.length} stored memories with emotional attunement
              </p>
            </div>
          </div>

          <button
            id="close-letter-modal-btn"
            onClick={handleClose}
            className="p-2 rounded-xl text-[#8C7B6E] hover:text-[#4A443F] hover:bg-[#F5F1E9] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
          {loading && (
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#7D8F69]/10 border border-[#7D8F69]/20 flex items-center justify-center mx-auto text-[#7D8F69] animate-pulse">
                <Scroll className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h3 className="text-sm font-serif font-bold text-[#4A443F]">
                  Composing a Letter from {profile.name}...
                </h3>
                <p className="text-xs text-[#8C7B6E] leading-relaxed">
                  Reflecting on your recorded stories, anecdotes, and voice to weave a heartfelt, personal letter grounded in genuine memories.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 text-xs text-[#7D8F69] font-medium pt-2">
                <span className="w-2 h-2 rounded-full bg-[#7D8F69] animate-ping" />
                Attuning tone and memories...
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="py-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#4A443F]">Could Not Generate Letter</h3>
                <p className="text-xs text-rose-700">{error}</p>
              </div>
              <button
                onClick={() => fetchLetter()}
                className="px-5 py-2 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Try Again
              </button>
            </div>
          )}

          {letter && !loading && (
            <div className="space-y-6">
              {/* Parchment Styled Letter Container */}
              <div className="p-6 md:p-8 rounded-3xl bg-white border border-[#E5E0D5] shadow-xs relative">
                <div className="absolute top-4 right-4 text-[#E5E0D5]">
                  <Heart className="w-5 h-5 fill-current opacity-60" />
                </div>

                <div className="font-serif text-[#4A443F] text-[15px] leading-relaxed whitespace-pre-wrap selection:bg-[#7D8F69]/20">
                  {letter}
                </div>
              </div>

              {/* Memory Grounding Badge */}
              <div className="flex items-center justify-between text-xs text-[#8C7B6E] px-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#7D8F69]" />
                  <span>
                    Grounded strictly in {memoryCount} recorded {memoryCount === 1 ? 'memory' : 'memories'} &bull; Anti-fabrication verified
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 md:px-8 py-4 border-t border-[#E5E0D5] bg-[#FDFBF7] shrink-0">
          <button
            onClick={() => fetchLetter()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-medium text-[#8C7B6E] hover:text-[#4A443F] hover:bg-[#F5F1E9] transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Regenerate Letter
          </button>

          <div className="flex items-center gap-2.5">
            <button
              id="copy-letter-btn"
              onClick={handleCopy}
              disabled={!letter || loading}
              className="px-4 py-2 rounded-full bg-white hover:bg-[#F5F1E9] text-[#4A443F] text-xs font-medium border border-[#E5E0D5] inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#7D8F69]" />
                  Copied to Clipboard
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#8C7B6E]" />
                  Copy Text
                </>
              )}
            </button>

            <button
              id="download-letter-btn"
              onClick={handleDownload}
              disabled={!letter || loading}
              className="px-5 py-2.5 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#7D8F69]/20 transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Download as Text
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
