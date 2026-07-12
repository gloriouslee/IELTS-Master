'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import { evaluateEssayAction, generateWritingPromptAction } from '../actions';
import { WritingEvaluation } from '@/lib/ai/agents';
import { getDeepSeekKey } from '@/lib/ai/client-key';
import { FileText, Edit3, ArrowRight, ShieldCheck, Check, BarChart2, CheckCircle2, Languages, RefreshCw } from 'lucide-react';

const presetPrompts = [
  {
    title: 'Workplace Knowledge vs. Theory',
    prompt: 'Some people think that universities should provide graduates with the knowledge and skills needed in the workplace. Others think that the true function of a university should be to give access to knowledge for its own sake, regardless of whether the course is useful to an employer. Discuss both views and give your opinion.'
  },
  {
    title: 'Technology & Human Relationships',
    prompt: 'Many people argue that modern communication technology is making us more isolated and less able to form real relationships. To what extent do you agree or disagree with this statement?'
  },
  {
    title: 'Urban Traffic & Environment',
    prompt: 'Traffic congestion and air pollution in major cities have reached crisis levels. Some argue that raising fuel taxes is the best solution, while others believe infrastructure investment is necessary. Discuss both sides and offer your view.'
  }
];

const sentenceDrills = [
  { vi: 'Nhiều sinh viên sử dụng thư viện để học tập.', model: 'Many students use libraries to study.', focus: 'Present simple: plural subject + base verb.' },
  { vi: 'Chính phủ nên đầu tư nhiều hơn vào giao thông công cộng.', model: 'Governments should invest more in public transport.', focus: 'Modal verb “should” + base verb.' },
  { vi: 'Ô nhiễm không khí ảnh hưởng đến sức khỏe của người dân.', model: 'Air pollution affects people’s health.', focus: 'Third-person singular: pollution affects.' },
  { vi: 'Công nghệ giúp mọi người giao tiếp dễ dàng hơn.', model: 'Technology helps people communicate more easily.', focus: 'Verb + object + adverb.' },
];

type SentenceFeedback = { passed: string[]; improvements: string[] };

function reviewSimpleSentence(sentence: string): SentenceFeedback {
  const clean = sentence.trim();
  const words = clean.match(/[A-Za-z]+(?:['’-][A-Za-z]+)?/g) || [];
  const passed: string[] = [];
  const improvements: string[] = [];
  if (/^[A-Z]/.test(clean)) passed.push('Starts with a capital letter.'); else improvements.push('Begin the sentence with a capital letter.');
  if (/[.!?]$/.test(clean)) passed.push('Ends with correct punctuation.'); else improvements.push('Add a full stop at the end.');
  if (words.length >= 4) passed.push(`Clear sentence length: ${words.length} words.`); else improvements.push('Write at least 4 words: subject + verb + idea.');
  if (/\b(am|is|are|was|were|be|been|have|has|had|do|does|did|can|could|should|would|will|may|might|must|[a-z]+s|[a-z]+ed|[a-z]+ing)\b/i.test(clean)) passed.push('Contains a likely verb phrase.'); else improvements.push('Add a main verb to complete the idea.');
  if (/\bi\b/.test(clean) && !/\bI\b/.test(clean)) improvements.push('Write the pronoun “I” with a capital letter.');
  return { passed, improvements };
}

export default function WritingPage() {
  const router = useRouter();
  const { profile, loading, logout, updateProfile, refreshProfile } = useProfile();
  const [selectedPromptIdx, setSelectedPromptIdx] = useState(0);
  const [customPrompt, setCustomPrompt] = useState('');
  const [essayContent, setEssayContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<WritingEvaluation | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [revisions, setRevisions] = useState<{ band: number; at: string }[]>([]);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [promptTopic, setPromptTopic] = useState('Education');
  const [essayType, setEssayType] = useState('Discussion');
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [simpleSentence, setSimpleSentence] = useState('');
  const [sentenceFeedback, setSentenceFeedback] = useState<SentenceFeedback | null>(null);
  const [practiceTab, setPracticeTab] = useState<'essay' | 'sentences'>('essay');

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/auth');
    }
  }, [profile, loading, router]);

  useEffect(() => { const saved = localStorage.getItem('ielts-writing-draft'); if (saved) { try { const draft = JSON.parse(saved); queueMicrotask(() => { setEssayContent(draft.content || ''); setSeconds(draft.seconds || 0); }); } catch { localStorage.removeItem('ielts-writing-draft'); } } }, []);
  useEffect(() => { if (!timerRunning) return; const id = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(id); }, [timerRunning]);
  useEffect(() => { const id = window.setTimeout(() => { localStorage.setItem('ielts-writing-draft', JSON.stringify({ content: essayContent, seconds })); setSavedAt(new Date().toLocaleTimeString()); }, 600); return () => window.clearTimeout(id); }, [essayContent, seconds]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
        <span className="text-sm mt-4 text-muted-foreground">Loading Writing Examiner...</span>
      </div>
    );
  }

  if (!profile) return null;

  const currentPrompt = customPrompt || presetPrompts[selectedPromptIdx].prompt;
  const wordCount = essayContent.trim() === '' ? 0 : essayContent.trim().split(/\s+/).length;
  const timeLabel = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const generatePrompt = async () => { setGeneratingPrompt(true); try { setCustomPrompt(await generateWritingPromptAction(promptTopic, essayType, getDeepSeekKey() || undefined)); } finally { setGeneratingPrompt(false); } };
  const currentSentenceDrill = sentenceDrills[sentenceIndex];
  const checkSimpleSentence = () => { if (!simpleSentence.trim()) return; setSentenceFeedback(reviewSimpleSentence(simpleSentence)); };
  const nextSentenceDrill = () => { setSentenceIndex((index) => (index + 1) % sentenceDrills.length); setSimpleSentence(''); setSentenceFeedback(null); };

  const handleSubmitEssay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wordCount < 50) {
      alert('Your essay must be at least 50 words long to receive a meaningful IELTS evaluation.');
      return;
    }
    setSubmitting(true);
    setEvaluation(null);

    try {
      const result = await evaluateEssayAction(currentPrompt, essayContent, getDeepSeekKey() || undefined);
      setEvaluation(result);
      setChecklist([]);
      setRevisions((old) => [...old, { band: result.estimatedBand, at: new Date().toLocaleTimeString() }]);

      // Award XP
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) await refreshProfile();
      else await updateProfile({ xp_points: (profile.xp_points || 0) + 50 });
    } catch (err) {
      console.error(err);
      alert('AI scoring service failed. Please check your internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar userProfile={profile} onLogout={logout} />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto max-w-6xl mx-auto w-full">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Writing Examiner</h1>
            <p className="text-muted-foreground mt-1">Submit your Task 2 essay and get rated immediately on the 4 IELTS criteria.</p>
          </div>

          <div className="inline-flex w-full rounded-2xl border border-border bg-card p-1.5 sm:w-auto" role="tablist" aria-label="Writing practice type">
            <button type="button" role="tab" aria-selected={practiceTab === 'essay'} onClick={() => setPracticeTab('essay')} className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors sm:flex-none ${practiceTab === 'essay' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>Task 2 Essay</button>
            <button type="button" role="tab" aria-selected={practiceTab === 'sentences'} onClick={() => setPracticeTab('sentences')} className={`flex-1 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors sm:flex-none ${practiceTab === 'sentences' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>Luyện câu đơn</button>
          </div>

          {practiceTab === 'essay' && (
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Side: Editor & Prompt Setup */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-card border border-border p-6 rounded-3xl space-y-4">
                <div className="flex items-center space-x-2 text-primary font-bold">
                  <Edit3 className="h-5 w-5" />
                  <span>Choose Writing Topic</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {presetPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedPromptIdx(idx);
                        setCustomPrompt('');
                      }}
                      className={`text-xs px-3.5 py-2 rounded-xl font-semibold border transition-all ${
                        !customPrompt && selectedPromptIdx === idx
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {p.title}
                    </button>
                  ))}
                  <button
                    onClick={() => setCustomPrompt('Enter your custom essay prompt here...')}
                    className={`text-xs px-3.5 py-2 rounded-xl font-semibold border transition-all ${
                      customPrompt
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Custom Prompt
                  </button>
                  <button onClick={generatePrompt} disabled={generatingPrompt} className="text-xs px-3.5 py-2 rounded-xl font-semibold border bg-primary/10 text-primary disabled:opacity-50">{generatingPrompt ? 'Generating…' : '✨ Generate AI Prompt'}</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-muted-foreground">Topic<select value={promptTopic} onChange={(e) => setPromptTopic(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-secondary p-2 text-foreground"><option>Education</option><option>Technology</option><option>Environment</option><option>Health</option><option>Work & Employment</option><option>Society</option></select></label>
                  <label className="text-xs font-semibold text-muted-foreground">Task type<select value={essayType} onChange={(e) => setEssayType(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-secondary p-2 text-foreground"><option>Discussion</option><option>Opinion</option><option>Advantages & Disadvantages</option><option>Problem & Solution</option></select></label>
                </div>

                {customPrompt ? (
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={3}
                    className="w-full bg-secondary border border-border focus:border-primary/50 p-4 rounded-2xl text-sm focus:outline-none transition-all leading-relaxed"
                  />
                ) : (
                  <div className="bg-secondary/40 border border-border/80 p-4 rounded-2xl text-sm leading-relaxed italic text-muted-foreground">
                    &ldquo;{presetPrompts[selectedPromptIdx].prompt}&rdquo;
                  </div>
                )}
              </div>

              {/* Essay input editor */}
              <form onSubmit={handleSubmitEssay} className="space-y-4">
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm focus-within:border-primary/45 transition-colors">
                  <div className="px-6 py-4 border-b border-border bg-secondary/20 flex justify-between items-center text-xs font-semibold text-muted-foreground">
                    <span>TYPE YOUR RESPONSE · Task 2</span>
                    <span>⏱ {timeLabel}</span>
                    <button type="button" onClick={() => setTimerRunning((value) => !value)} className="rounded-lg bg-primary/10 px-2 py-1 text-primary">{timerRunning ? 'Tạm dừng / Pause' : seconds ? 'Tiếp tục / Resume' : 'Bắt đầu / Start timer'}</button>
                    <span>Saved {savedAt || 'locally'}</span>
                    <span className={wordCount >= 250 ? 'text-emerald-500 font-bold' : ''}>
                      {wordCount} words {wordCount < 250 ? '(Recommend 250+)' : '(Target met)'}
                    </span>
                  </div>

                  <textarea
                    value={essayContent}
                    onChange={(e) => setEssayContent(e.target.value)}
                    placeholder="In contemporary society, it is widely argued that..."
                    rows={12}
                    className="w-full bg-transparent p-6 text-sm focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || wordCount < 10}
                  className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-4 rounded-2xl flex items-center justify-center space-x-2 transition-all disabled:opacity-50 shadow-md shadow-primary/10"
                >
                  <span>{submitting ? 'Analyzing Essay with AI...' : 'Submit Essay for Evaluation'}</span>
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </div>

            {/* Right Side: Evaluation Report */}
            <div className="lg:col-span-5 space-y-6">
              {evaluation ? (
                <div className="bg-card border border-border p-6 rounded-3xl space-y-6">
                  {/* Band Badges header */}
                  <div className="flex justify-between items-center border-b border-border pb-4">
                    <div>
                      <h3 className="text-xl font-bold">Evaluation Report</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">IELTS band scores analysis.</p>
                    </div>
                    <div className="bg-primary/10 text-primary border border-primary/20 p-3 rounded-2xl text-center shrink-0">
                      <span className="text-[10px] font-extrabold uppercase block tracking-wider">Band Est.</span>
                      <span className="text-3xl font-extrabold">{evaluation.estimatedBand}</span>
                    </div>
                  </div>

                  {/* Criteria Scores grid */}
                  <div className="space-y-3.5">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center space-x-1.5">
                      <BarChart2 className="h-4 w-4 text-primary" />
                      <span>Criteria Breakdown</span>
                    </h4>

                    {[
                      { name: 'Task Achievement', score: evaluation.taskAchievement },
                      { name: 'Coherence & Cohesion', score: evaluation.coherenceCohesion },
                      { name: 'Lexical Resource', score: evaluation.lexicalResource },
                      { name: 'Grammatical Accuracy', score: evaluation.grammarAccuracy }
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{item.name}</span>
                          <span className="text-primary">{item.score}</span>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${(item.score / 9) * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Strengths & Weaknesses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-4.5 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest block">Strengths</span>
                      <ul className="space-y-2">
                        {evaluation.strengths.map((str, k) => (
                          <li key={k} className="text-xs text-muted-foreground flex items-start space-x-1.5 leading-relaxed">
                            <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-destructive/5 border border-destructive/10 p-4.5 rounded-2xl space-y-2">
                      <span className="text-[10px] font-bold text-destructive uppercase tracking-widest block">Weaknesses</span>
                      <ul className="space-y-2">
                        {evaluation.weaknesses.map((weak, k) => (
                          <li key={k} className="text-xs text-muted-foreground flex items-start space-x-1.5 leading-relaxed">
                            <span className="text-destructive font-extrabold mt-0.5 text-xs shrink-0">•</span>
                            <span>{weak}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Actions checklist */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Key Suggested Improvements</span>
                    <div className="space-y-2">
                      {evaluation.suggestedImprovements.map((imp, k) => (
                        <div key={k} className="flex items-start space-x-2 text-xs leading-relaxed p-2.5 bg-secondary/40 border border-border rounded-xl">
                          <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                          <span>{imp}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {evaluation.paragraphFeedback && <div className="space-y-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Feedback by paragraph</span>{evaluation.paragraphFeedback.map((item) => <div key={item.label} className="rounded-xl border border-border bg-secondary/30 p-3 text-xs"><b>{item.label}</b><p className="mt-1 text-emerald-500">✓ {item.strength}</p><p className="mt-1 text-destructive">Focus: {item.priority}</p><p className="mt-1 text-muted-foreground">Try: {item.suggestion}</p></div>)}</div>}
                  {evaluation.checklist && <div className="space-y-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Revision checklist</span>{evaluation.checklist.map((item) => <label key={item} className="flex gap-2 rounded-xl bg-secondary/30 p-2 text-xs"><input type="checkbox" checked={checklist.includes(item)} onChange={() => setChecklist((old) => old.includes(item) ? old.filter((value) => value !== item) : [...old, item])} />{item}</label>)}</div>}
                  {revisions.length > 1 && <div className="rounded-xl border border-border p-3 text-xs">Revision progress: previous Band {revisions[revisions.length - 2].band} → current Band {evaluation.estimatedBand}</div>}

                  {/* Improved Content comparison */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">AI-Improved Model Essay</span>
                    <div className="bg-secondary/40 border border-border p-4.5 rounded-2xl text-xs leading-relaxed text-muted-foreground max-h-60 overflow-y-auto font-medium whitespace-pre-line">
                      {evaluation.improvedVersion}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-card border border-border/80 p-8 rounded-3xl text-center space-y-4 h-full flex flex-col justify-center items-center text-muted-foreground py-16">
                  <FileText className="h-12 w-12 text-primary/20 animate-float" />
                  <div>
                    <h3 className="text-base font-bold text-foreground">Waiting for submission</h3>
                    <p className="text-xs max-w-xs mt-1">Once you complete typing your task 2 response and click submit, the AI examiner reports will render here.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {practiceTab === 'sentences' && (
          <section className="rounded-3xl border border-border bg-card p-6 md:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <div className="flex items-center gap-2 text-primary"><Languages className="h-5 w-5" /><p className="text-xs font-bold uppercase tracking-widest">Sentence builder</p></div>
                <h2 className="mt-2 text-2xl font-extrabold">Luyện viết câu đơn</h2>
                <p className="mt-1 text-sm text-muted-foreground">Dịch một ý đơn giản sang tiếng Anh, sau đó tự kiểm tra cấu trúc cơ bản trước khi viết đoạn văn.</p>
              </div>
              <button type="button" onClick={nextSentenceDrill} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary"><RefreshCw className="h-4 w-4" />Câu mới</button>
            </div>
            <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
              <div className="rounded-2xl bg-primary/5 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Viết câu này bằng tiếng Anh</p>
                <p className="mt-3 text-lg font-semibold leading-relaxed">{currentSentenceDrill.vi}</p>
                <p className="mt-5 text-sm text-muted-foreground"><b>Focus:</b> {currentSentenceDrill.focus}</p>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground" htmlFor="simple-sentence">Câu của bạn</label>
                <textarea id="simple-sentence" value={simpleSentence} onChange={(event) => { setSimpleSentence(event.target.value); setSentenceFeedback(null); }} placeholder="Write one complete English sentence…" rows={4} className="mt-2 w-full rounded-2xl border border-border bg-secondary p-4 text-sm leading-relaxed outline-none focus:border-primary" />
                <button type="button" onClick={checkSimpleSentence} disabled={!simpleSentence.trim()} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Kiểm tra câu</button>
              </div>
            </div>
            {sentenceFeedback && <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"><p className="text-sm font-bold text-emerald-600">Bạn đã làm tốt</p><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{sentenceFeedback.passed.length ? sentenceFeedback.passed.map((item) => <li key={item}>✓ {item}</li>) : <li>Hãy hoàn thành câu rồi kiểm tra lại.</li>}</ul></div><div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"><p className="text-sm font-bold text-amber-600">Cần chỉnh</p><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{sentenceFeedback.improvements.length ? sentenceFeedback.improvements.map((item) => <li key={item}>• {item}</li>) : <li>Không có lỗi cơ bản được phát hiện.</li>}</ul></div><div className="rounded-2xl border border-border bg-secondary/40 p-4 md:col-span-2"><p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Câu mẫu</p><p className="mt-2 font-medium">{currentSentenceDrill.model}</p></div></div>}
          </section>
          )}
        </main>
      </div>
    </div>
  );
}
