export type SrsRating = 'again' | 'hard' | 'good' | 'easy';
export type SrsState = { intervalDays: number; repetitionCount: number; retentionRate: number; nextReviewAt: string };
export function scheduleReview(state: Partial<SrsState>, rating: SrsRating): SrsState {
  const current = Math.max(1, state.intervalDays || 1); const days = rating === 'again' ? 0 : rating === 'hard' ? 1 : rating === 'good' ? current * 2 : current * 3;
  const minutes = rating === 'again' ? 10 : days * 24 * 60;
  return { intervalDays: Math.max(1, days), repetitionCount: rating === 'again' ? 0 : (state.repetitionCount || 0) + 1, retentionRate: Math.max(0, Math.min(100, (state.retentionRate || 0) + (rating === 'easy' ? 20 : rating === 'good' ? 10 : rating === 'hard' ? 2 : -15))), nextReviewAt: new Date(Date.now() + minutes * 60000).toISOString() };
}
