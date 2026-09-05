'use client';

import React from 'react';
import { RefreshCw, Flame } from 'lucide-react';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#FDFBF7] text-[#4A443F] min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans antialiased">
        <div className="w-14 h-14 rounded-2xl bg-[#7D8F69]/15 border border-[#7D8F69]/30 flex items-center justify-center text-[#7D8F69] mb-5 shadow-xs">
          <Flame className="w-7 h-7 fill-[#7D8F69]/40" />
        </div>
        <h2 className="text-2xl font-serif text-[#4A443F] mb-2 font-medium">
          Sanctuary Synchronization
        </h2>
        <p className="text-sm text-[#8C7B6E] max-w-md mb-6 leading-relaxed">
          The sanctuary encountered an unexpected state. Click below to refresh the view.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            id="global-error-retry-btn"
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-full bg-white hover:bg-[#F4F1EA] text-[#4A443F] border border-[#DCD5C9] text-xs font-medium cursor-pointer transition-colors shadow-xs"
          >
            Try Again
          </button>
          <button
            id="global-error-reload-btn"
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Sanctuary
          </button>
        </div>
      </body>
    </html>
  );
}
