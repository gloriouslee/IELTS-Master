'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock3, FileText, Headphones, Mic, Play, RotateCcw } from 'lucide-react';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import { useProfile } from '@/hooks/useProfile';
import { completeActivityAction } from '@/app/actions';

const questions = [
  {
    question: 'Which paragraph would most likely contain the author\'s main argument?',
    options: ['The introduction', 'The first body paragraph', 'The conclusion', 'The reference list'],
    answer: 0,
  },
  {
    question: 'Choose the most natural academic connector: “___, public transport should be made more affordable.”',
    options: ['However', 'Therefore', 'For example', 'Meanwhile'],
    answer: 1,
  },
  {
    question: 'Which phrase best introduces a contrasting view?',
    options: ['In addition', 'As a result', 'On the other hand', 'For this reason'],
    answer: 2,
  },
];

export default function MockTestPage() {
  const router = useRouter();
  const { profile, loading, logout, updateProfile, refreshProfile } = useProfile();
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!loading && !profile) router.replace('/auth');
  }, [loading, profile, router]);

  const correct = useMemo(
    () => answers.reduce((total, answer, index) => total + Number(answer === questions[index].answer), 0),
    [answers],
  );

  if (loading || !profile) return <main className="min-h-screen grid place-items-center bg-background text-muted-foreground">Loading test center…</main>;

  const finishTest = async () => {
    setSubmitted(true);
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      await completeActivityAction('mock_test', `mock-${new Date().toISOString()}-${correct}`);
      await refreshProfile();
    } else {
      await updateProfile({ xp_points: profile.xp_points + 30 });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar userProfile={profile} onLogout={logout} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 p-6 md:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">Practice under pressure</p>
            <h1 className="mt-2 text-3xl font-extrabold">Mock Test Center</h1>
            <p className="mt-2 text-muted-foreground">Build confidence with timed IELTS-style mini tests before taking a full mock.</p>
          </div>

          {!started ? (
            <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  [FileText, 'Reading mini test', '3 questions · 8 minutes'],
                  [Headphones, 'Listening practice', 'Coming next'],
                  [Mic, 'Speaking simulation', 'Use the Speaking Examiner today'],
                ].map(([Icon, title, detail]) => {
                  const CardIcon = Icon as typeof FileText;
                  return <div key={title as string} className="rounded-2xl border border-border bg-secondary/30 p-5"><CardIcon className="h-6 w-6 text-primary" /><h2 className="mt-4 font-bold">{title as string}</h2><p className="mt-1 text-sm text-muted-foreground">{detail as string}</p></div>;
                })}
              </div>
              <button onClick={() => setStarted(true)} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"><Play className="h-4 w-4" />Start reading mini test</button>
            </section>
          ) : (
            <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
              <div className="mb-8 flex items-center justify-between border-b border-border pb-5"><div><h2 className="font-bold">Reading mini test</h2><p className="mt-1 text-sm text-muted-foreground">Choose the best answer for each question.</p></div><span className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm font-semibold"><Clock3 className="h-4 w-4" />8 min</span></div>
              <div className="space-y-8">
                {questions.map((item, questionIndex) => <fieldset key={item.question} disabled={submitted}><legend className="font-semibold">{questionIndex + 1}. {item.question}</legend><div className="mt-4 grid gap-3">{item.options.map((option, optionIndex) => <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 text-sm hover:bg-secondary/50"><input type="radio" name={`question-${questionIndex}`} checked={answers[questionIndex] === optionIndex} onChange={() => setAnswers((previous) => { const next = [...previous]; next[questionIndex] = optionIndex; return next; })} />{option}</label>)}</div></fieldset>)}
              </div>
              {submitted ? <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5"><div className="flex items-center gap-2 font-bold text-emerald-500"><CheckCircle2 className="h-5 w-5" />You scored {correct}/{questions.length}</div><p className="mt-2 text-sm text-muted-foreground">You earned {30 + correct * 10} XP. Review the Writing and Speaking modules for a fuller diagnostic.</p><Link href="/analytics" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">View your analytics →</Link></div> : <button onClick={finishTest} disabled={answers.length !== questions.length} className="mt-8 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">Submit answers</button>}
              {submitted && <button onClick={() => { setAnswers([]); setSubmitted(false); }} className="ml-3 mt-8 inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 font-semibold"><RotateCcw className="h-4 w-4" />Try again</button>}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
