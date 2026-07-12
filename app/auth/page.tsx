'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/layout/navbar';
import { GraduationCap, Mail, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';

const isMockMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function GoogleMark() {
  return <span className="text-base font-bold leading-none text-primary" aria-hidden="true">G</span>;
}

export default function AuthPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    if (isMockMode) {
      // Simulate successful local mock login/signup
      const mockUser = {
        id: 'mock-user-12345',
        email,
        full_name: fullName || 'IELTS Learner',
        xp_points: 150,
        daily_streak: 3,
        daily_goal_minutes: 30,
        current_band: 5.5,
        target_band: 7.5,
      };
      localStorage.setItem('ielts-mock-user', JSON.stringify(mockUser));
      setTimeout(() => {
        setLoading(false);
        router.push('/dashboard');
      }, 1000);
      return;
    }

    const supabase = createClient();

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || 'IELTS Learner',
            },
          },
        });
        if (error) throw error;
        alert('Verification email sent! Check your inbox.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    if (isMockMode) {
      const mockUser = {
        id: 'mock-google-user',
        email: 'google.student@example.com',
        full_name: 'Google Learner',
        xp_points: 300,
        daily_streak: 5,
        daily_goal_minutes: 30,
        current_band: 6.0,
        target_band: 8.0,
      };
      localStorage.setItem('ielts-mock-user', JSON.stringify(mockUser));
      router.push('/dashboard');
      return;
    }

    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Google Auth login failed.');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-6 py-12 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl p-8 shadow-xl relative z-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="p-3 bg-primary/10 rounded-2xl mb-4">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isSignUp ? 'Create your Account' : 'Welcome Back'}
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isSignUp
                ? 'Join IELTS AI Master and start planning your roadmap.'
                : 'Sign in to review your flashcards and essay marks.'}
            </p>
          </div>

          {isMockMode && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Offline / Developer Demo Mode:</span> No Supabase API keys detected in your environment. You can register/login with any email/password to evaluate pages locally!
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-secondary border border-border focus:border-primary/50 py-3 pl-12 pr-4 rounded-xl text-sm focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-secondary border border-border focus:border-primary/50 py-3 pl-12 pr-4 rounded-xl text-sm focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-secondary border border-border focus:border-primary/50 py-3 pl-12 pr-4 rounded-xl text-sm focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-3.5 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-primary/10 disabled:opacity-50 mt-6"
            >
              <span>{loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <span className="relative bg-card px-3 text-xs text-muted-foreground">Or continue with</span>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full border border-border bg-card hover:bg-secondary/40 text-foreground font-semibold py-3.5 rounded-xl flex items-center justify-center space-x-2 transition-all"
          >
            <GoogleMark />
            <span>Sign In with Google</span>
          </button>

          <div className="mt-8 text-center text-sm">
            <span className="text-muted-foreground">
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </span>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-primary font-semibold hover:underline"
            >
              {isSignUp ? 'Sign In' : 'Register Now'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
