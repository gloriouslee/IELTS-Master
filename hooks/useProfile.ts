'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  current_band: number;
  target_band: number;
  exam_date?: string;
  daily_goal_minutes: number;
  xp_points: number;
  daily_streak: number;
  onboarding_completed?: boolean;
  preferred_skills?: string[];
}

export function useProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const hasKeys = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!hasKeys) {
      const mockUserStr = localStorage.getItem('ielts-mock-user');
      if (mockUserStr) {
        try {
          setProfile(JSON.parse(mockUserStr) as UserProfile);
        } catch (error) {
          console.error('Error parsing mock profile', error);
          localStorage.removeItem('ielts-mock-user');
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
      return;
    }

    const supabase = createClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }

      const { data: dbProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // Create fallback local user
        const fallback: UserProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || 'IELTS Learner',
          xp_points: 0,
          daily_streak: 1,
          current_band: 4.0,
          target_band: 7.5,
          daily_goal_minutes: 30,
          onboarding_completed: false,
          preferred_skills: [],
        };
        setProfile(fallback);
      } else if (dbProfile) {
        setProfile({
          id: dbProfile.id,
          full_name: dbProfile.full_name || 'IELTS Learner',
          avatar_url: dbProfile.avatar_url,
          current_band: Number(dbProfile.current_band) || 3.0,
          target_band: Number(dbProfile.target_band) || 7.5,
          exam_date: dbProfile.exam_date,
          daily_goal_minutes: dbProfile.daily_goal_minutes || 30,
          xp_points: dbProfile.xp_points || 0,
          daily_streak: dbProfile.daily_streak || 0,
          onboarding_completed: dbProfile.onboarding_completed || false,
          preferred_skills: dbProfile.preferred_skills || [],
        });
      }
    } catch (err) {
      console.error('Error fetching profile', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchProfile();
    });
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;

    const hasKeys = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!hasKeys) {
      const newProfile = { ...profile, ...updates };
      setProfile(newProfile);
      localStorage.setItem('ielts-mock-user', JSON.stringify(newProfile));
    } else {
      const editable = new Set<keyof UserProfile>([
        'full_name', 'avatar_url', 'current_band', 'target_band', 'exam_date',
        'daily_goal_minutes', 'onboarding_completed', 'preferred_skills',
      ]);
      const safeUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => editable.has(key as keyof UserProfile)),
      ) as Partial<UserProfile>;
      if (!Object.keys(safeUpdates).length) return;
      setProfile({ ...profile, ...safeUpdates });
      const supabase = createClient();
      try {
        const { error } = await supabase
          .from('profiles')
          .update(safeUpdates)
          .eq('id', profile.id);
        if (error) throw error;
      } catch (err) {
        console.error('Failed to sync changes with Supabase db', err);
        setProfile(profile);
        throw err;
      }
    }
  };

  const logout = () => {
    localStorage.removeItem('ielts-mock-user');
    const hasKeys = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (hasKeys) {
      const supabase = createClient();
      supabase.auth.signOut().then(() => router.push('/'));
    } else {
      router.push('/');
    }
  };

  return { profile, loading, updateProfile, logout, refreshProfile: fetchProfile };
}
