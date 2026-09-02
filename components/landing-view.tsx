'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Flame, Sparkles, ShieldCheck, Heart, ArrowRight, BookOpen, MessageSquare, Compass, Info } from 'lucide-react';

export default function LandingView() {
  const { signInWithGoogle, signInAsGuest, authError, clearAuthError } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch {
      // Error handled in AuthContext
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#4A443F] flex flex-col justify-between selection:bg-[#7D8F69]/20 selection:text-[#4A443F] font-sans">
      {/* Top Bar */}
      <header className="px-6 py-4 border-b border-[#E5E0D5] bg-[#FDFBF7]/90 backdrop-blur-md flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#7D8F69]/10 border border-[#7D8F69]/30 flex items-center justify-center text-[#7D8F69]">
            <Flame className="w-4 h-4 fill-[#7D8F69]/30" />
          </div>
          <div>
            <span className="text-xl font-serif font-bold tracking-tight text-[#7D8F69]">Smriti</span>
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-[0.2em] text-[#A69F95] ml-2">
              Digital Memorial Companion
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="header-guest-btn"
            onClick={signInAsGuest}
            className="px-3.5 py-1.5 rounded-full text-xs text-[#8C7B6E] hover:text-[#4A443F] hover:bg-[#F5F1E9] border border-[#E5E0D5] cursor-pointer transition-colors"
          >
            Guest Preview
          </button>
          <button
            id="header-sign-in-btn"
            onClick={handleSignIn}
            disabled={signingIn}
            className="px-4 py-2 rounded-full bg-white hover:bg-[#F5F1E9] text-[#4A443F] text-xs font-medium border border-[#E5E0D5] inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            {signingIn ? 'Connecting...' : 'Sign In with Google'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-16 text-center space-y-8 my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#7D8F69]/10 border border-[#7D8F69]/25 text-[#7D8F69] text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>A Tender, Grounded Digital Memorial Companion</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold tracking-tight text-[#4A443F] leading-tight">
          Keep their stories, sayings, and spirit alive forever.
        </h1>

        <p className="text-base sm:text-lg text-[#8C7B6E] max-w-2xl mx-auto leading-relaxed">
          Smriti transforms the personal memories, anecdotes, and wisdom of your loved ones into vector embeddings — enabling an AI companion that responds traceably grounded in what you recorded.
        </p>

        {authError && (
          <div className="max-w-xl mx-auto p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-[#4A443F] text-xs text-left space-y-2.5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-900 font-semibold">
                <Info className="w-4 h-4 shrink-0" />
                <span>Authentication Notice</span>
              </div>
              <button
                onClick={clearAuthError}
                className="text-amber-800/60 hover:text-amber-900 text-sm font-bold cursor-pointer"
              >
                ×
              </button>
            </div>
            <p className="text-amber-950/80 leading-relaxed">{authError}</p>
            <div className="pt-1">
              <button
                onClick={signInAsGuest}
                className="px-3.5 py-1.5 rounded-full bg-amber-800 text-white font-medium hover:bg-amber-900 text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Compass className="w-3.5 h-3.5" />
                Enter Guest Sanctuary Instantly
              </button>
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            id="hero-sign-in-btn"
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white font-medium text-sm transition-all shadow-md shadow-[#7D8F69]/25 inline-flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            {signingIn ? (
              <>Connecting with Google...</>
            ) : (
              <>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
                </svg>
                Sign In with Google
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            id="hero-guest-btn"
            onClick={signInAsGuest}
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white hover:bg-[#F5F1E9] text-[#4A443F] font-medium text-sm border border-[#E5E0D5] inline-flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <Compass className="w-4 h-4 text-[#7D8F69]" />
            Enter Guest Sanctuary (Instant Preview)
          </button>
        </div>

        {/* Feature Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-10 text-left">
          <div className="p-6 rounded-2xl bg-white border border-[#E5E0D5] shadow-xs space-y-3">
            <div className="p-2.5 rounded-xl bg-[#7D8F69]/10 border border-[#7D8F69]/20 text-[#7D8F69] w-fit">
              <Heart className="w-4 h-4" />
            </div>
            <h3 className="text-base font-serif font-bold text-[#4A443F]">Memorial Profiles</h3>
            <p className="text-xs text-[#8C7B6E] leading-relaxed">
              Create individualized sanctuaries with photos or emojis, personality traits, and custom tone notes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E5E0D5] shadow-xs space-y-3">
            <div className="p-2.5 rounded-xl bg-[#7D8F69]/10 border border-[#7D8F69]/20 text-[#7D8F69] w-fit">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-base font-serif font-bold text-[#4A443F]">Vector Memory Indexing</h3>
            <p className="text-xs text-[#8C7B6E] leading-relaxed">
              Capture anecdotes, recipes, and quotes. Each story is vectorized with Gemini text embeddings for intelligent retrieval.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E5E0D5] shadow-xs space-y-3">
            <div className="p-2.5 rounded-xl bg-[#7D8F69]/10 border border-[#7D8F69]/20 text-[#7D8F69] w-fit">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="text-base font-serif font-bold text-[#4A443F]">Traceably Grounded AI</h3>
            <p className="text-xs text-[#8C7B6E] leading-relaxed">
              Converse with a companion that answers only with genuine reference to your recorded memories, never fabricating stories.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-[#E5E0D5] bg-[#FAF8F5] text-center text-xs text-[#8C7B6E] max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[#8C7B6E]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#7D8F69]" />
          <span>Private, Owner-Isolated Cloud Firestore Security</span>
        </div>
        <div>
          <span>Smriti Digital Memorial &bull; Built with Gemini API & Cloud Run</span>
        </div>
      </footer>
    </div>
  );
}

