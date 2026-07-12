'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import { clearTutorHistoryAction, getTutorHistoryAction, sendTutorMessage } from '../actions';
import { Send, GraduationCap, Sparkles, Trash2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function TutorPage() {
  const router = useRouter();
  const { profile, loading, logout, updateProfile, refreshProfile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    'Explain the structure of an IELTS Writing Task 2 opinion essay.',
    'Correct the grammar: "Although he worked hard, but he failed the exam."',
    'Give me 5 academic synonyms and collocations for the word "Important".',
    'Explain the difference between band 6.0 and band 8.0 in lexical resource.'
  ];

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/auth');
    }
  }, [profile, loading, router]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      void getTutorHistoryAction().then(setMessages).catch(error => console.error(error));
      return;
    }
    const saved = localStorage.getItem('ielts-tutor-messages');
    if (saved) try { queueMicrotask(() => setMessages(JSON.parse(saved))); }
    catch { localStorage.removeItem('ielts-tutor-messages'); }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
        <span className="text-sm mt-4 text-muted-foreground">Loading AI Tutor...</span>
      </div>
    );
  }

  if (!profile) return null;

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);

    const nextMsg: Message = { role: 'user', content: text };
    const nextHistory = [...messages, nextMsg];
    setMessages(nextHistory);
    setInputValue('');

    // Save history temporarily
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) localStorage.setItem('ielts-tutor-messages', JSON.stringify(nextHistory));

    try {
      const reply = await sendTutorMessage(text, messages);
      const finalHistory = [...nextHistory, { role: 'assistant' as const, content: reply }];
      setMessages(finalHistory);
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) localStorage.setItem('ielts-tutor-messages', JSON.stringify(finalHistory));

      // Award XP
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) await refreshProfile();
      else await updateProfile({ xp_points: (profile.xp_points || 0) + 10 });
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Clear chat session history?')) {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) await clearTutorHistoryAction();
      setMessages([]);
      localStorage.removeItem('ielts-tutor-messages');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar userProfile={profile} onLogout={logout} />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 flex flex-col h-[calc(100vh-73px)] overflow-hidden relative">
          {/* Header */}
          <div className="p-4 border-b border-border bg-card/60 backdrop-blur-sm flex justify-between items-center z-10">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">IELTS AI Tutor</h1>
                <p className="text-[10px] text-muted-foreground">Ask anything about academic grammar, vocabulary, or structures</p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-secondary rounded-xl transition-all border border-transparent hover:border-border"
                title="Clear History"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Chat Messages Panel */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto h-full flex flex-col items-center justify-center text-center space-y-8 py-12">
                <div className="p-4 bg-primary/10 rounded-full animate-float">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">How can I assist your IELTS prep today?</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md">
                    I can explain complex grammar patterns, draft essay structures, recommend collocations, and evaluate sentences.
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-3 w-full max-w-xl">
                  {suggestionChips.map((chip, k) => (
                    <button
                      key={k}
                      onClick={() => handleSendMessage(chip)}
                      className="bg-card border border-border hover:border-primary/50 text-left p-3.5 rounded-2xl text-xs text-muted-foreground hover:text-foreground transition-all duration-200 shadow-sm leading-relaxed"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex items-start space-x-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                    )}
                    <div className={`p-4 rounded-2xl max-w-xl text-sm leading-relaxed shadow-sm border ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground border-primary-foreground/10'
                        : 'bg-card text-foreground border-border'
                    }`}>
                      <div className="whitespace-pre-line font-medium">{msg.content}</div>
                    </div>
                    {msg.role === 'user' && (
                      <div className="h-8 w-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0 text-xs font-bold uppercase">
                        {profile.full_name.charAt(0)}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            )}
          </div>

          {/* Form Input */}
          <div className="p-4 border-t border-border bg-card/60 backdrop-blur-sm">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="max-w-3xl mx-auto flex items-center space-x-3"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask your IELTS Tutor..."
                disabled={sending}
                className="flex-1 bg-secondary border border-border focus:border-primary/50 py-3.5 px-5 rounded-2xl text-sm focus:outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || sending}
                className="p-3.5 bg-primary hover:bg-primary/95 text-primary-foreground rounded-2xl transition-all shadow-md shadow-primary/10 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
