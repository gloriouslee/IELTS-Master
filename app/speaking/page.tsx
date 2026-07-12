'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import Navbar from '@/components/layout/navbar';
import Sidebar from '@/components/layout/sidebar';
import { evaluateSpeakingAction, transcribeAudioAction } from '../actions';
import { SpeakingEvaluation } from '@/lib/ai/agents';
import { Mic, Square, Sparkles, CheckCircle2 } from 'lucide-react';

const speakingTopics = [
  { id: '1', title: 'Describe a memorable journey you took', category: 'Part 2 Cue Card' },
  { id: '2', title: 'How does modern transport compare to the past?', category: 'Part 3 Discussion' },
  { id: '3', title: 'Describe an interesting person you met recently', category: 'Part 2 Cue Card' },
];

export default function SpeakingPage() {
  const router = useRouter();
  const { profile, loading, logout, updateProfile, refreshProfile } = useProfile();
  const [selectedTopicIdx, setSelectedTopicIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<SpeakingEvaluation | null>(null);
  const [transcript, setTranscript] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && !profile) {
      router.push('/auth');
    }
  }, [profile, loading, router]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
        <span className="text-sm mt-4 text-muted-foreground">Loading Speaking Examiner...</span>
      </div>
    );
  }

  if (!profile) return null;

  const activeTopic = speakingTopics[selectedTopicIdx];

  const startRecording = async () => {
    setAudioUrl(null);
    setAudioBlob(null);
    setTranscript('');
    setEvaluation(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(audioUrl);
        // Stop all track media elements
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Microphone permission blocked or unavailable.', error);
      alert('Microphone access is required to evaluate your speaking.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleEvaluateSpeaking = async () => {
    setSubmitting(true);
    setEvaluation(null);

    if (!audioBlob) return;

    try {
        const realTranscript = await transcribeAudioAction(audioBlob);
        if (!realTranscript.trim()) throw new Error('No speech was detected in the recording.');
        setTranscript(realTranscript);
        const result = await evaluateSpeakingAction(activeTopic.title, realTranscript);
        setEvaluation(result);

        // Award XP
        if (process.env.NEXT_PUBLIC_SUPABASE_URL) await refreshProfile();
        else await updateProfile({ xp_points: (profile.xp_points || 0) + 60 });
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'AI speaking evaluation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar userProfile={profile} onLogout={logout} />

      <div className="flex flex-1">
        <Sidebar />

        <main className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto max-w-6xl mx-auto w-full">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Speaking Examiner</h1>
            <p className="text-muted-foreground mt-1">Record your response to cue cards or questions. Get detailed assessment of pronunciation, vocabulary, and grammar.</p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Column: Recording Controls */}
            <div className="lg:col-span-7 space-y-6">
              {/* Select Topic */}
              <div className="bg-card border border-border p-6 rounded-3xl space-y-4">
                <div className="flex items-center space-x-2 text-primary font-bold">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                  <span>Choose Speaking Topic</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {speakingTopics.map((t, idx) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedTopicIdx(idx);
                        setAudioUrl(null);
                        setAudioBlob(null);
                        setEvaluation(null);
                        setTranscript('');
                      }}
                      className={`text-xs px-3.5 py-2 rounded-xl font-semibold border transition-all ${
                        selectedTopicIdx === idx
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t.category} {idx + 1}
                    </button>
                  ))}
                </div>

                <div className="bg-secondary/40 border border-border/80 p-5 rounded-2xl text-base font-semibold leading-relaxed">
                  {activeTopic.title}
                </div>
              </div>

              {/* Recording Panel */}
              <div className="bg-card border border-border p-8 rounded-3xl flex flex-col items-center justify-center space-y-6 text-center">
                {recording ? (
                  <div className="space-y-4 flex flex-col items-center">
                    <div className="w-20 h-20 bg-destructive/10 border-4 border-destructive rounded-full flex items-center justify-center animate-pulse">
                      <Square className="h-8 w-8 text-destructive fill-destructive" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold tracking-tight text-destructive">{formatTime(recordingSeconds)}</h4>
                      <p className="text-xs text-muted-foreground">Recording active. Speak clearly into your microphone.</p>
                    </div>
                    <button
                      onClick={stopRecording}
                      className="bg-secondary border border-border hover:bg-secondary/80 font-bold px-6 py-2 rounded-xl text-xs transition-all"
                    >
                      Stop Recording
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 flex flex-col items-center">
                    <button
                      onClick={startRecording}
                      className="w-20 h-20 bg-primary hover:bg-primary/95 text-primary-foreground rounded-full flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-[1.03] transition-all"
                      title="Start Recording"
                    >
                      <Mic className="h-8 w-8 text-primary-foreground" />
                    </button>
                    <div>
                      <h4 className="font-bold text-base">Click mic to record</h4>
                      <p className="text-xs text-muted-foreground mt-1">Make sure to practice outline planning before you speak.</p>
                    </div>
                  </div>
                )}

                {/* Audio playback */}
                {audioUrl && (
                  <div className="w-full space-y-4 pt-4 border-t border-border/60">
                    <div className="flex justify-center">
                      <audio src={audioUrl} controls className="w-full max-w-md" />
                    </div>
                    <button
                      onClick={handleEvaluateSpeaking}
                      disabled={submitting}
                      className="w-full max-w-xs bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-3 rounded-xl transition-all shadow-md shadow-primary/10"
                    >
                      {submitting ? 'Transcribing & Grading...' : 'Grade Speech Performance'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Audio Results Report */}
            <div className="lg:col-span-5 space-y-6">
              {evaluation ? (
                <div className="bg-card border border-border p-6 rounded-3xl space-y-6">
                  {/* Results Header */}
                  <div className="flex justify-between items-center border-b border-border pb-4">
                    <div>
                      <h3 className="text-xl font-bold">Speaking Evaluation</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Whisper + DeepSeek Grading.</p>
                    </div>
                    <div className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 p-3 rounded-2xl text-center shrink-0">
                      <span className="text-[10px] font-extrabold uppercase block tracking-wider">Estimated Band</span>
                      <span className="text-3xl font-extrabold">{evaluation.estimatedBand}</span>
                    </div>
                  </div>

                  {/* Criteria scores */}
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: 'Fluency & Coherence', score: evaluation.fluencyScore },
                      { name: 'Pronunciation (audio analysis required)', score: evaluation.pronunciationScore ?? 'Not scored' },
                      { name: 'Lexical Resource', score: evaluation.vocabularyScore },
                      { name: 'Grammar Accuracy', score: evaluation.grammarScore },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-secondary/40 border border-border/80 p-3 rounded-xl text-center">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase">{item.name}</span>
                        <h4 className="text-lg font-bold text-foreground mt-1">{item.score}</h4>
                      </div>
                    ))}
                  </div>

                  {/* Transcript */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Transcription</span>
                    <div className="bg-secondary/40 border border-border p-4 rounded-xl text-xs leading-relaxed text-muted-foreground italic max-h-40 overflow-y-auto">
                      &ldquo;{transcript}&rdquo;
                    </div>
                  </div>

                  {/* Feedback summary */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Detailed Examiner Feedback</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {evaluation.detailedFeedback}
                    </p>
                  </div>

                  {/* Suggested Improvements */}
                  {evaluation.suggestedImprovements && evaluation.suggestedImprovements.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Key Suggested Improvements</span>
                      <div className="space-y-2">
                        {evaluation.suggestedImprovements.map((imp, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-xs leading-relaxed p-2.5 bg-secondary/40 border border-border rounded-xl">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{imp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-card border border-border/80 p-8 rounded-3xl text-center space-y-4 h-full flex flex-col justify-center items-center text-muted-foreground py-16">
                  <Mic className="h-12 w-12 text-primary/20 animate-float" />
                  <div>
                    <h3 className="text-base font-bold text-foreground">Waiting for audio</h3>
                    <p className="text-xs max-w-xs mt-1">Once you complete recording your voice response and click grade, the Whisper transcript and AI examiner marks will display here.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
