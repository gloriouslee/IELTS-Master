'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeneratedVocabulary } from '@/app/actions';
import { createClient } from '@/lib/supabase/client';

export type Flashcard = GeneratedVocabulary & {
  id: string; retentionRate: number; topic?: string; folder?: string; learned?: boolean; vietnameseMeaning?: string; partOfSpeech?: string;
  intervalDays?: number; repetitionCount?: number; easeFactor?: number; nextReviewAt?: string;
};

const CARDS_KEY = 'ielts-vocabulary';
const FOLDERS_KEY = 'ielts-vocabulary-folders';
export const defaultFolders = ['General'];

const newId = () => crypto.randomUUID();
const withId = (card: Omit<Flashcard, 'id'> & { id?: string }): Flashcard => ({ ...card, id: card.id || newId() });

type Row = {
  id: string; word: string; ipa: string; definition: string; vietnamese_meaning: string | null; part_of_speech: string | null; topic: string | null; folder: string;
  collocations: string[]; examples: string[]; synonyms: string[]; learned: boolean; retention_rate: number; interval_days: number; repetition_count: number;
  ease_factor: number; next_review_at: string | null;
};

const fromRow = (row: Row): Flashcard => ({
  id: row.id, word: row.word, ipa: row.ipa, definition: row.definition, vietnameseMeaning: row.vietnamese_meaning || undefined, partOfSpeech: row.part_of_speech || undefined,
  topic: row.topic || undefined, folder: row.folder, collocations: row.collocations, examples: row.examples, synonyms: row.synonyms, learned: row.learned,
  retentionRate: row.retention_rate, intervalDays: row.interval_days, repetitionCount: row.repetition_count, easeFactor: Number(row.ease_factor), nextReviewAt: row.next_review_at || undefined,
});

const toRow = (userId: string, card: Flashcard) => ({
  id: card.id, user_id: userId, word: card.word, ipa: card.ipa || '', definition: card.definition || '', vietnamese_meaning: card.vietnameseMeaning ?? null,
  part_of_speech: card.partOfSpeech ?? null, topic: card.topic ?? null, folder: card.folder || 'General', collocations: card.collocations || [], examples: card.examples || [],
  synonyms: card.synonyms || [], learned: Boolean(card.learned), retention_rate: Math.round(card.retentionRate || 0), interval_days: card.intervalDays || 1,
  repetition_count: card.repetitionCount || 0, ease_factor: card.easeFactor || 2.5, next_review_at: card.nextReviewAt ?? null, updated_at: new Date().toISOString(),
});

const readLocal = (): Flashcard[] | null => {
  try { const saved = localStorage.getItem(CARDS_KEY); return saved ? (JSON.parse(saved) as Flashcard[]).map(withId) : null; } catch { return null; }
};

export function useVocabulary(userId: string | undefined, starter: Omit<Flashcard, 'id'>[]) {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [folders, setFolders] = useState<string[]>(defaultFolders);
  const [ready, setReady] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const cardsRef = useRef<Flashcard[]>([]);
  const starterRef = useRef(starter);

  const commit = useCallback((next: Flashcard[]) => {
    cardsRef.current = next;
    setCards(next);
    try { localStorage.setItem(CARDS_KEY, JSON.stringify(next)); } catch { /* storage full or unavailable */ }
  }, []);

  // Initial load: Supabase is the source of truth; legacy localStorage cards are uploaded once.
  useEffect(() => {
    let cancelled = false;
    const savedFolders = (() => { try { return JSON.parse(localStorage.getItem(FOLDERS_KEY) || '[]') as string[]; } catch { return []; } })();
    const load = async () => {
      const local = readLocal();
      let next = local ?? starterRef.current.map(withId);
      if (configured && userId) {
        const supabase = createClient();
        const { data, error } = await supabase.from('vocabulary_cards').select('*').eq('user_id', userId).order('created_at', { ascending: false });
        if (error) setSyncError(error.message);
        else if (data.length) next = (data as Row[]).map(fromRow);
        else if (local?.length) {
          const { error: uploadError } = await supabase.from('vocabulary_cards').upsert(local.map(card => toRow(userId, card)), { onConflict: 'id' });
          if (uploadError) setSyncError(uploadError.message);
        }
      } else if (configured) return; // wait for the profile before choosing a source
      if (cancelled) return;
      cardsRef.current = next;
      setCards(next);
      setFolders(Array.from(new Set([...defaultFolders, ...savedFolders, ...next.map(card => card.folder || 'General')])));
      setReady(true);
    };
    void load();
    return () => { cancelled = true; };
  }, [configured, userId]);

  const persist = useCallback((previous: Flashcard[], next: Flashcard[]) => {
    if (!configured || !userId) return;
    const before = new Map(previous.map(card => [card.id, card]));
    const changed = next.filter(card => before.get(card.id) !== card);
    const nextIds = new Set(next.map(card => card.id));
    const removed = previous.filter(card => !nextIds.has(card.id)).map(card => card.id);
    const supabase = createClient();
    void (async () => {
      if (removed.length) {
        const { error } = await supabase.from('vocabulary_cards').delete().in('id', removed).eq('user_id', userId);
        if (error) setSyncError(error.message);
      }
      if (changed.length) {
        const { error } = await supabase.from('vocabulary_cards').upsert(changed.map(card => toRow(userId, card)), { onConflict: 'id' });
        setSyncError(error ? error.message : null);
      }
    })();
  }, [configured, userId]);

  const updateCards = useCallback((fn: (old: Flashcard[]) => Flashcard[]) => {
    const previous = cardsRef.current;
    const next = fn(previous);
    commit(next);
    persist(previous, next);
  }, [commit, persist]);

  const saveFolders = useCallback((next: string[]) => {
    const unique = Array.from(new Set(defaultFolders.concat(next)));
    setFolders(unique);
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(unique));
  }, []);

  return { cards, folders, ready, syncError, updateCards, saveFolders };
}

export { withId };
