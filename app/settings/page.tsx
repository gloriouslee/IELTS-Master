'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound, RotateCcw, Save, ShieldCheck, Trash2, User } from 'lucide-react';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import { useTheme } from '@/components/theme-provider';
import { useProfile, type UserProfile } from '@/hooks/useProfile';
import { clearDeepSeekKey, getDeepSeekKey, maskedDeepSeekKey, setDeepSeekKey } from '@/lib/ai/client-key';

const skills = ['Reading', 'Writing', 'Speaking', 'Vocabulary'];

function SettingsForm({ profile, updateProfile }: {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [key, setKey] = useState(() => getDeepSeekKey());
  const [show, setShow] = useState(false);
  const [notice, setNotice] = useState('');
  const [name, setName] = useState(profile.full_name);
  const [avatar, setAvatar] = useState(profile.avatar_url || '');
  const [band, setBand] = useState(profile.current_band);
  const [target, setTarget] = useState(profile.target_band);
  const [date, setDate] = useState(profile.exam_date || '');
  const [minutes, setMinutes] = useState(profile.daily_goal_minutes);
  const [focus, setFocus] = useState<string[]>(profile.preferred_skills || []);

  const saveProfile = async () => {
    try {
      await updateProfile({
        full_name: name || 'IELTS Learner', avatar_url: avatar, current_band: band,
        target_band: target, exam_date: date || undefined, daily_goal_minutes: minutes,
        preferred_skills: focus,
      });
      setNotice('Settings saved.');
    } catch {
      setNotice('Unable to save settings. Please try again.');
    }
  };

  const reset = async () => {
    if (!window.confirm('Reset your learning plan?')) return;
    localStorage.removeItem('ielts-roadmap-v2');
    localStorage.removeItem(`ielts-daily-plan-${new Date().toISOString().slice(0, 10)}`);
    await updateProfile({ onboarding_completed: false });
    router.push('/onboarding');
  };

  return <>
    <section className="grid gap-5 rounded-3xl border border-border bg-card p-6 md:grid-cols-2">
      <div>
        <h2 className="flex gap-2 font-bold"><User className="h-5 w-5 text-primary"/>Hồ sơ / Profile</h2>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Display name" className="mt-4 w-full rounded-xl border border-border bg-secondary p-3"/>
        <input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="Avatar URL" className="mt-3 w-full rounded-xl border border-border bg-secondary p-3"/>
        {/* User-supplied avatar hosts cannot be enumerated for next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {avatar && <img src={avatar} alt="Avatar preview" className="mt-3 h-12 w-12 rounded-full object-cover"/>}
      </div>
      <div>
        <h2 className="font-bold">Kế hoạch học / Learning plan</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <input type="number" value={band} onChange={e => setBand(Number(e.target.value))} className="rounded-xl bg-secondary p-3"/>
          <input type="number" value={target} onChange={e => setTarget(Number(e.target.value))} className="rounded-xl bg-secondary p-3"/>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl bg-secondary p-3"/>
          <input type="number" value={minutes} onChange={e => setMinutes(Number(e.target.value))} className="rounded-xl bg-secondary p-3"/>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{skills.map(skill => <button key={skill} onClick={() => setFocus(current => current.includes(skill) ? current.filter(item => item !== skill) : [...current, skill])} className={`rounded-lg px-3 py-1 text-xs ${focus.includes(skill) ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>{skill}</button>)}</div>
      </div>
      <button onClick={saveProfile} className="rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"><Save className="mr-2 inline h-4 w-4"/>Save profile</button>
      <button onClick={reset} className="rounded-xl border border-destructive/30 px-4 py-3 text-destructive"><RotateCcw className="mr-2 inline h-4 w-4"/>Reset learning plan</button>
    </section>
    <section className="rounded-3xl border border-border bg-card p-6">
      <h2 className="font-bold">Giao diện / Appearance</h2>
      <button onClick={toggleTheme} className="mt-3 rounded-xl bg-secondary px-4 py-2">Theme: {theme} (toggle)</button>
    </section>
    <section className="rounded-3xl border border-border bg-card p-6">
      <div className="flex gap-2"><KeyRound className="text-primary"/><h2 className="font-bold">DeepSeek API key</h2></div>
      <p className="mt-2 text-sm text-muted-foreground">Kept only for this browser session: {maskedDeepSeekKey() || 'not configured'}</p>
      <div className="mt-4 flex gap-2">
        <input type={show ? 'text' : 'password'} value={key} onChange={e => setKey(e.target.value)} placeholder="sk-..." className="min-w-0 flex-1 rounded-xl bg-secondary p-3 font-mono"/>
        <button onClick={() => setShow(!show)} className="rounded-xl border border-border px-3">{show ? <EyeOff/> : <Eye/>}</button>
        <button onClick={() => { setDeepSeekKey(key); setNotice('API key saved for this session.'); }} className="rounded-xl bg-primary px-4 text-primary-foreground">Save</button>
        <button onClick={() => { clearDeepSeekKey(); setKey(''); }} className="rounded-xl border border-border px-3"><Trash2/></button>
      </div>
      <p className="mt-3 flex gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4"/>The key is cleared when this browser session ends.</p>
    </section>
    {notice && <p className="text-sm text-emerald-500">{notice}</p>}
  </>;
}

export default function Settings() {
  const { profile, loading, logout, updateProfile } = useProfile();
  if (loading || !profile) return <main className="grid min-h-screen place-items-center">Loading…</main>;

  return <div className="flex min-h-screen flex-col bg-background">
    <Navbar userProfile={profile} onLogout={logout}/>
    <div className="flex flex-1"><Sidebar/><main className="mx-auto w-full max-w-4xl flex-1 space-y-6 p-6">
      <header><p className="text-xs font-bold uppercase tracking-widest text-primary">Settings</p><h1 className="mt-2 text-3xl font-extrabold">Cài đặt / Settings</h1></header>
      <SettingsForm key={profile.id} profile={profile} updateProfile={updateProfile}/>
    </main></div>
  </div>;
}
