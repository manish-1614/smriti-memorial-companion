import React from 'react';
import Link from 'next/link';
import { Flame, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center font-sans text-[#4A443F]">
      <div className="w-14 h-14 rounded-2xl bg-[#7D8F69]/15 border border-[#7D8F69]/30 flex items-center justify-center text-[#7D8F69] mb-5 shadow-xs">
        <Flame className="w-7 h-7 fill-[#7D8F69]/40" />
      </div>

      <h2 className="text-2xl font-serif text-[#4A443F] mb-2 font-medium">
        Page Not Found
      </h2>

      <p className="text-sm text-[#8C7B6E] max-w-md mb-6 leading-relaxed">
        The sanctuary page you are looking for does not exist or has been relocated.
      </p>

      <Link
        href="/"
        className="px-5 py-2.5 rounded-full bg-[#7D8F69] hover:bg-[#6E7E5B] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Return to Sanctuary
      </Link>
    </div>
  );
}
