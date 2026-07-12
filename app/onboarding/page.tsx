'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Target } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

const skills = ['Reading', 'Writing', 'Speaking', 'Vocabulary'];

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, loading, updateProfile } = useProfile();
  const [currentBand, setCurrentBand] = useState(profile?.current_band ?? 5.5);
  const [targetBand, setTargetBand] = useState(profile?.target_band ?? 7);
  const [examDate, setExamDate] = useState(profile?.exam_date ?? '');
  const [minutes, setMinutes] = useState(profile?.daily_goal_minutes ?? 30);
  const [preferredSkills, setPreferredSkills] = useState<string[]>(profile?.preferred_skills ?? ['Writing']);

  if (loading || !profile) return <main className="grid min-h-screen place-items-center">Loading…</main>;
  const toggle = (skill: string) => setPreferredSkills((items) => items.includes(skill) ? items.filter((item) => item !== skill) : [...items, skill]);
  const finish = async () => { await updateProfile({ current_band: currentBand, target_band: targetBand, exam_date: examDate || undefined, daily_goal_minutes: minutes, preferred_skills: preferredSkills, onboarding_completed: true }); router.replace('/dashboard'); };
  return <main className="min-h-screen bg-background p-6"><section className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-8"><Target className="h-9 w-9 text-primary" /><h1 className="mt-4 text-3xl font-extrabold">Thiết lập lộ trình / Set your learning plan</h1><p className="mt-2 text-muted-foreground">Chúng tôi sẽ tạo nhiệm vụ học hằng ngày theo mục tiêu của bạn.</p><div className="mt-7 grid gap-4 sm:grid-cols-2"><label>Band hiện tại<input type="number" step="0.5" min="1" max="9" value={currentBand} onChange={(e) => setCurrentBand(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-border bg-secondary p-3" /></label><label>Band mục tiêu<input type="number" step="0.5" min="1" max="9" value={targetBand} onChange={(e) => setTargetBand(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-border bg-secondary p-3" /></label><label>Ngày thi<input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="mt-2 w-full rounded-xl border border-border bg-secondary p-3" /></label><label>Phút học/ngày<input type="number" min="10" max="240" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="mt-2 w-full rounded-xl border border-border bg-secondary p-3" /></label></div><p className="mt-6 font-semibold">Kỹ năng ưu tiên / Focus skills</p><div className="mt-3 flex flex-wrap gap-2">{skills.map((skill) => <button key={skill} onClick={() => toggle(skill)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${preferredSkills.includes(skill) ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>{skill}</button>)}</div><button onClick={finish} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground"><CheckCircle2 className="h-5 w-5" />Bắt đầu hôm nay</button></section></main>;
}
