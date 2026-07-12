'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/navbar';
import { motion } from 'framer-motion';
import { Badge } from '@astryxdesign/core/Badge';
import { Card } from '@astryxdesign/core/Card';
import { Link as AstryxLink } from '@astryxdesign/core/Link';
import {
  Brain,
  FileText,
  Mic,
  Sparkles,
  Trophy,
  ArrowRight,
  CheckCircle,
  HelpCircle,
  MessageSquare,
  BookOpen
} from 'lucide-react';

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const features = [
    {
      icon: MessageSquare,
      title: 'AI Tutor',
      desc: 'Ask grammar questions, dissect reading passages, and practice conversational queries 24/7.',
      color: 'text-emerald-500 bg-emerald-500/10'
    },
    {
      icon: FileText,
      title: 'Writing Examiner',
      desc: 'Get estimated band scores and detailed breakdown across the 4 core IELTS criteria in seconds.',
      color: 'text-blue-500 bg-blue-500/10'
    },
    {
      icon: Mic,
      title: 'Speaking Examiner',
      desc: 'Record answers directly. Convert speech to text and analyze grammar, vocabulary, and fluency.',
      color: 'text-violet-500 bg-violet-500/10'
    },
    {
      icon: BookOpen,
      title: 'Roadmap & Vocab',
      desc: 'Generate spaced-repetition flashcards and dynamic visual roadmap tailored to your target exam date.',
      color: 'text-amber-500 bg-amber-500/10'
    }
  ];

  const stories = [
    { name: 'Le Nguyen', score: 'Band 8.0 (Up from 5.5)', comment: 'The writing evaluation is scary accurate. The suggestions helped me fix my task achievement issues.' },
    { name: 'Kenji Sato', score: 'Band 7.5 (Up from 6.0)', comment: 'Speaking mock exams used to terrify me. Practicing with the AI Speaking Examiner gave me confidence!' },
    { name: 'Sarah Al-Mansoori', score: 'Band 8.5 (Up from 7.0)', comment: 'A complete game-changer. Spaced repetition flashcards with custom AI example sentences made words stick.' }
  ];

  const pricing = [
    { name: 'Free Trial', price: '0', features: ['3 Essay Evaluations', '3 Speaking Transcriptions', 'AI Chat Tutor Access', 'Basic Roadmap Plan'], cta: 'Start Practicing', primary: false },
    { name: 'Pro Pass', price: '19', features: ['Unlimited Essay Reviews', 'Unlimited Speaking Transcriptions', 'DeepSeek-V3 Band Analytics', 'Interactive Vocab Engine', 'Spaced Repetition Sync'], cta: 'Go Pro Now', primary: true },
    { name: 'Premium Coach', price: '39', features: ['Everything in Pro', 'Weekly Personalized PDF Roadmaps', 'Priority Model Speeds', 'Custom Tutor Personalities', 'Expert Grading Audits'], cta: 'Become Master', primary: false }
  ];

  const faqs = [
    { q: 'How does the AI grade essays?', a: 'We process submissions through DeepSeek models tuned on the official IELTS rubric, scoring criteria: Task Achievement, Coherence & Cohesion, Lexical Resource, and Grammatical Range.' },
    { q: 'How does the Speaking assessment work?', a: 'Your browser records your voice. Whisper API converts it to a rich transcript, which is then audited for vocabulary range, grammatical errors, and estimated bands.' },
    { q: 'Is the pricing subscription-based?', a: 'Yes. You can cancel, upgrade, or downgrade at any time directly through your user settings dashboard.' }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <header className="relative w-full py-20 md:py-32 overflow-hidden flex flex-col items-center justify-center border-b border-border bg-gradient-to-b from-primary/5 via-transparent to-transparent">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="container mx-auto px-6 text-center max-w-5xl relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <Badge variant="purple" icon={<Sparkles className="h-4 w-4" />} label="Powering IELTS Band 8.0+ success" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight"
          >
            Master the IELTS Exam <br />
            <span className="bg-gradient-to-r from-primary via-indigo-500 to-violet-500 bg-clip-text text-transparent">
              Guided by Smart AI
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed"
          >
            Get instant, deep examinations of your Writing & Speaking answers. Map your personalized roadmap and query our AI Tutor anytime.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md"
          >
            <Link
              href="/auth"
              className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-6 py-3.5 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all"
            >
              <span>Start Free Evaluation</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="flex-1 bg-secondary border border-border hover:bg-secondary/80 font-semibold px-6 py-3.5 rounded-2xl flex items-center justify-center transition-all"
            >
              Learn More
            </Link>
          </motion.div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-20 border-b border-border bg-secondary/20">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Interactive Modules Tailored for IELTS</h2>
            <p className="text-muted-foreground mt-4">We break down your practice session into highly structured assessments built around the active IELTS curriculum.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feat, index) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="transition-transform hover:scale-[1.02]"
                >
                  <Card width="100%" minHeight={270} padding={6}>
                    <div className="flex h-full flex-col justify-between">
                      <div>
                        <div className={`p-3 rounded-xl w-fit ${feat.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold mt-5">{feat.title}</h3>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{feat.desc}</p>
                      </div>
                      <AstryxLink href="/auth" isStandalone>
                        Try {feat.title}
                      </AstryxLink>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Success Stories Section */}
      <section className="py-20 border-b border-border">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold">Recommended By Successful Candidates</h2>
            <p className="text-muted-foreground mt-3">Read testimonies from real IELTS Master students who boosted their bands.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {stories.map((story, i) => (
              <div key={i} className="bg-card border border-border p-6 rounded-2xl shadow-sm relative">
                <div className="flex items-center space-x-2 text-primary font-bold mb-4">
                  <Trophy className="h-5 w-5" />
                  <span>{story.score}</span>
                </div>
                <p className="text-sm italic text-muted-foreground leading-relaxed">&ldquo;{story.comment}&rdquo;</p>
                <div className="border-t border-border mt-6 pt-4 text-xs font-semibold text-foreground">
                  — {story.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 border-b border-border bg-secondary/20">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold">Flexible, Goal-Oriented Pricing</h2>
            <p className="text-muted-foreground mt-3">Select the package that fits your exam target and available hours.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {pricing.map((plan, i) => (
              <div
                key={i}
                className={`bg-card border p-8 rounded-3xl shadow-sm flex flex-col justify-between relative transition-all hover:scale-[1.01] ${
                  plan.primary ? 'border-primary shadow-lg shadow-primary/5 ring-1 ring-primary' : 'border-border'
                }`}
              >
                {plan.primary && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="flex items-baseline space-x-1 mt-4">
                    <span className="text-4xl font-extrabold">${plan.price}</span>
                    <span className="text-muted-foreground text-sm">/ month</span>
                  </div>
                  <ul className="mt-8 space-y-3.5">
                    {plan.features.map((feat, k) => (
                      <li key={k} className="flex items-start space-x-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  href="/auth"
                  className={`w-full mt-8 py-3 rounded-2xl font-bold text-sm text-center transition-all ${
                    plan.primary
                      ? 'bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/10'
                      : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 border-b border-border">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-card border border-border rounded-2xl overflow-hidden transition-all">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full text-left px-6 py-5 flex justify-between items-center hover:bg-secondary/20 transition-colors"
                >
                  <span className="font-semibold text-foreground flex items-center space-x-2">
                    <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                    <span>{faq.q}</span>
                  </span>
                  <span className="text-xl text-muted-foreground font-light">{activeFaq === idx ? '−' : '+'}</span>
                </button>
                {activeFaq === idx && (
                  <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 text-center bg-gradient-to-t from-primary/10 via-transparent to-transparent flex flex-col items-center">
        <div className="container mx-auto px-6 max-w-xl flex flex-col items-center">
          <Brain className="h-16 w-16 text-primary animate-float mb-6" />
          <h2 className="text-4xl font-extrabold">Ready to Boost Your Band?</h2>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            Create your account today, diagnose your writing and speaking strengths, and start your roadmap to band 8.0+.
          </p>
          <Link
            href="/auth"
            className="mt-8 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-8 py-4 rounded-2xl flex items-center space-x-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
          >
            <span>Start Free Evaluation</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground bg-card">
        &copy; {new Date().getFullYear()} IELTS AI Master. All rights reserved. Built with Next.js & Supabase.
      </footer>
    </div>
  );
}
