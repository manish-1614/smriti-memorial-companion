import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Smriti — Digital Memorial Companion',
  description: 'A digital memorial companion grounded in personal memories using Gemini API vector embeddings and Cloud Firestore.',
  openGraph: {
    title: 'Smriti — Digital Memorial Companion',
    description: 'A digital memorial companion grounded in personal memories using Gemini API vector embeddings and Cloud Firestore.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smriti — Digital Memorial Companion',
    description: 'A digital memorial companion grounded in personal memories using Gemini API vector embeddings and Cloud Firestore.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#FDFBF7] text-[#4A443F] antialiased min-h-screen selection:bg-[#7D8F69]/20 selection:text-[#4A443F]" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
