import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'IELTS AI Master - Score Band 8.0+ with Personal AI Tutor',
  description: 'Unleash the power of AI to supercharge your IELTS score. Get instantaneous expert writing feedback, speaking assessments, custom vocab flashcards, and personalized roadmaps.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark" data-theme="dark" data-astryx-theme="neutral" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans antialiased bg-background text-foreground selection:bg-primary/20 transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
