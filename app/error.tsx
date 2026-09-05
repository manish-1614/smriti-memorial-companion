'use client';

import React from 'react';
import { RefreshCw, Flame, ArrowLeft } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error?.name === 'ChunkLoadError' ||
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('ChunkLoadError');

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center font-sans selection:bg-[#7D8F69]/20 selection:text-[#4A443F]">
      <div className="w-14 h-14 rounded-2xl bg-[#7D8F69]/15 border border-[#7D8F69]/30 flex items-center justify-center text-[#7D8F69] mb-5 shadow-xs">
        <Flame className="w-7 h-7 fill-[#7D8F69]/40" />
      </div>

      <h2 className="text-2xl font-serif text-[#4A443F] mb-2 font-medium">
        Sanctuary Notice
      </h2>

      <p className="text-sm text-[#8C7B6E] max-w-md mb-6 leading-relaxed">
        {isChunkError
          ? 'The application bundle was updated. Click reload below to refresh the sanctuary assets.'
          : error?.message || 'An unexpected state occurred. You can restore your view safely below.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          id="error-reset-view-btn"
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-full bg-white hover:bg-[#F4F1EA] text-[#4A443F] border border-[#DCD5C9] text-xs font-medium cursor-pointer transition-colors shadow-xs inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Try Again
        </button>
        <button
          id="error-manual-reload-btn"
          onClick={() => {
            window.location.reload();
          }}
          className="px-5 py-2.5 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reload Sanctuary
        </button>
      </div>
    </div>
  );
}
