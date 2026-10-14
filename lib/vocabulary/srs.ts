export type SrsRating = 'again' | 'hard' | 'good' | 'easy';
export type SrsState = { intervalDays: number; repetitionCount: number; retentionRate: number; nextReviewAt: string; easeFactor: number };

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// SM-2 style scheduling: each word has its own ease factor, so words you struggle with
// come back sooner while easy words spread out faster.
export function scheduleReview(state: Partial<SrsState>, rating: SrsRating): SrsState {
  const ease = clamp(state.easeFactor || DEFAULT_EASE, MIN_EASE, 3);
  const current = Math.max(1, state.intervalDays || 1);
  const reps = state.repetitionCount || 0;

  let days: number;
  let nextEase = ease;
  if (rating === 'again') { days = 0; nextEase = ease - 0.2; }
  else if (rating === 'hard') { days = Math.max(1, Math.round(current * 1.2)); nextEase = ease - 0.15; }
  else if (rating === 'good') days = reps === 0 ? 1 : reps === 1 ? 3 : Math.round(current * ease);
  else { days = reps === 0 ? 4 : Math.round(current * ease * 1.3); nextEase = ease + 0.15; }

  const minutes = rating === 'again' ? 10 : days * 24 * 60;
  return {
    intervalDays: Math.max(1, days),
    repetitionCount: rating === 'again' ? 0 : reps + 1,
    retentionRate: clamp((state.retentionRate || 0) + (rating === 'easy' ? 20 : rating === 'good' ? 10 : rating === 'hard' ? 2 : -15), 0, 100),
    easeFactor: Math.round(clamp(nextEase, MIN_EASE, 3) * 100) / 100,
    nextReviewAt: new Date(Date.now() + minutes * 60000).toISOString(),
  };
}

export function reviewLabel(state: Partial<SrsState>, rating: SrsRating): string {
  if (rating === 'again') return '10m';
  const { intervalDays } = scheduleReview(state, rating);
  return `${intervalDays}d`;
}
