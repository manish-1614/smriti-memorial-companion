'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import LandingView from '@/components/landing-view';
import SmritiDashboard from '@/components/smriti-dashboard';
import { Flame } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center text-[#4A443F] space-y-4 font-sans">
        <div className="w-12 h-12 rounded-2xl bg-[#7D8F69]/15 border border-[#7D8F69]/30 flex items-center justify-center text-[#7D8F69] animate-pulse">
          <Flame className="w-6 h-6 fill-[#7D8F69]/40" />
        </div>
        <p className="text-xs text-[#8C7B6E] tracking-wide">Connecting to Smriti sanctuary...</p>
      </div>
    );
  }

  if (!user) {
    return <LandingView />;
  }

  return <SmritiDashboard />;
}
