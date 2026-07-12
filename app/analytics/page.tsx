'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Award, Database, Flame } from 'lucide-react';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import { useProfile } from '@/hooks/useProfile';
import { createClient } from '@/lib/supabase/client';

type Session = { duration_minutes: number; activity_type: string; created_at: string };
type Evaluation = { estimated_band: number; created_at: string; skill: string };

export default function AnalyticsPage() {
  const router = useRouter();
  const { profile, loading, logout } = useProfile();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [today] = useState(() => Date.now());
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => {
    if (!loading && !profile) router.replace('/auth');
  }, [profile, loading, router]);

  useEffect(() => {
    if (!profile || !configured) {
      queueMicrotask(() => setDataLoading(false));
      return;
    }
    const load = async () => {
      const supabase = createClient();
      const since = new Date(Date.now() - 90 * 86400000).toISOString();
      const [sessionResult, essayResult, speakingResult] = await Promise.all([
        supabase.from('study_sessions').select('duration_minutes,activity_type,created_at').gte('created_at', since).order('created_at'),
        supabase.from('essay_feedback').select('estimated_band,created_at,essays!inner(user_id)').eq('essays.user_id', profile.id).gte('created_at', since).order('created_at'),
        supabase.from('speaking_feedback').select('estimated_band,created_at,speaking_records!inner(user_id)').eq('speaking_records.user_id', profile.id).gte('created_at', since).order('created_at'),
      ]);
      setSessions((sessionResult.data || []) as Session[]);
      setEvaluations([
        ...((essayResult.data || []).map(item => ({ estimated_band: Number(item.estimated_band), created_at: item.created_at, skill: 'Writing' }))),
        ...((speakingResult.data || []).map(item => ({ estimated_band: Number(item.estimated_band), created_at: item.created_at, skill: 'Speaking' }))),
      ].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      setDataLoading(false);
    };
    void load();
  }, [configured, profile]);

  const weeklyMinutes = useMemo(() => {
    const values = Array(7).fill(0) as number[];
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6);
    sessions.forEach(session => {
      const index = Math.floor((new Date(session.created_at).getTime() - start.getTime()) / 86400000);
      if (index >= 0 && index < 7) values[index] += session.duration_minutes;
    });
    return values;
  }, [sessions]);
  const totalMinutes = sessions.reduce((sum, item) => sum + item.duration_minutes, 0);
  const recentBand = evaluations.at(-1)?.estimated_band;
  const maxMinutes = Math.max(...weeklyMinutes, 1);

  if (loading || !profile) return <main className="grid min-h-screen place-items-center">Loading analytics…</main>;
  return <div className="flex min-h-screen flex-col bg-background">
    <Navbar userProfile={profile} onLogout={logout}/><div className="flex flex-1"><Sidebar/>
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 p-6 md:p-8">
      <header><p className="text-xs font-bold uppercase tracking-widest text-primary">Verified learning data</p><h1 className="mt-2 text-3xl font-extrabold">Performance Analytics</h1><p className="mt-2 text-muted-foreground">Progress from saved study sessions and examiner results.</p></header>
      {!configured && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600"><Database className="mr-2 inline h-4 w-4"/>Demo mode: connect Supabase to collect cross-device analytics.</div>}
      <section className="grid gap-4 md:grid-cols-4">
        <Metric icon={Activity} label="Study time (90 days)" value={`${Math.round(totalMinutes / 6) / 10} h`}/>
        <Metric icon={Award} label="Latest assessed band" value={recentBand?.toFixed(1) || 'No result'}/>
        <Metric icon={Flame} label="Learning streak" value={`${profile.daily_streak} days`}/>
        <Metric icon={Award} label="Verified XP" value={`${profile.xp_points} XP`}/>
      </section>
      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-bold">Last 7 days</h2>
        <div className="mt-6 grid h-52 grid-cols-7 items-end gap-3">{weeklyMinutes.map((minutes, index) => <div key={index} className="flex h-full flex-col justify-end gap-2 text-center"><span className="text-xs text-muted-foreground">{minutes}m</span><div className="min-h-1 rounded-t-lg bg-primary" style={{ height: `${Math.max(2, minutes / maxMinutes * 100)}%` }}/><span className="text-xs">{new Date(today - (6-index)*86400000).toLocaleDateString(undefined,{weekday:'short'})}</span></div>)}</div>
      </section>
      <section className="rounded-3xl border border-border bg-card p-6"><h2 className="font-bold">Assessed band history</h2>{dataLoading ? <p className="mt-4 text-sm text-muted-foreground">Loading saved results…</p> : evaluations.length ? <div className="mt-4 space-y-3">{evaluations.slice(-10).reverse().map((item, index) => <div key={`${item.created_at}-${index}`} className="flex justify-between rounded-xl bg-secondary p-3"><span>{item.skill}</span><span className="font-bold">Band {item.estimated_band.toFixed(1)} · {new Date(item.created_at).toLocaleDateString()}</span></div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">Complete a Writing or Speaking evaluation to start your history.</p>}</section>
    </main></div>
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><Icon className="h-5 w-5 text-primary"/><p className="mt-3 text-2xl font-extrabold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>;
}
