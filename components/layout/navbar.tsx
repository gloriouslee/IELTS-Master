'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '../theme-provider';
import { Sun, Moon, GraduationCap, Award, Flame, User } from 'lucide-react';

export default function Navbar({
  userProfile,
  onLogout,
}: {
  userProfile?: { full_name?: string; xp_points?: number; daily_streak?: number; avatar_url?: string } | null;
  onLogout?: () => void;
}) {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md px-6 py-4 flex justify-between items-center transition-all">
      <div className="flex items-center space-x-3">
        <GraduationCap className="h-8 w-8 text-primary animate-float" />
        <Link href="/" className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
          IELTS AI Master
        </Link>
      </div>

      <div className="flex items-center space-x-6">
        {userProfile && (
          <div className="hidden md:flex items-center space-x-6 mr-2">
            {/* Streak */}
            <div className="flex items-center space-x-1.5 text-amber-500 font-semibold" title="Daily Streak">
              <Flame className="h-5 w-5 fill-amber-500" />
              <span>{userProfile.daily_streak || 0} Days</span>
            </div>

            {/* XP */}
            <div className="flex items-center space-x-1.5 text-indigo-500 font-semibold" title="XP Points">
              <Award className="h-5 w-5" />
              <span>{userProfile.xp_points || 0} XP</span>
            </div>
          </div>
        )}

        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-all border border-border"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        {userProfile ? (
          <div className="flex items-center space-x-3">
            <Link href="/dashboard" className="flex items-center space-x-2 bg-secondary py-1.5 px-3 rounded-xl border border-border hover:bg-secondary/80 transition-all">
              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold uppercase overflow-hidden">
                {userProfile.avatar_url ? (
                  <>
                    {/* User-supplied avatar hosts cannot be enumerated for next/image. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={userProfile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                  </>
                ) : (
                  userProfile.full_name?.charAt(0) || <User className="h-4 w-4" />
                )}
              </div>
              <span className="hidden sm:inline text-sm font-medium">{userProfile.full_name || 'Student'}</span>
            </Link>
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        ) : (
          <Link
            href="/auth"
            className="bg-primary hover:bg-primary/95 text-primary-foreground px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary/20"
          >
            Get Started
          </Link>
        )}
      </div>
    </nav>
  );
}
