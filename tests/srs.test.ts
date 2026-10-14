import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleReview, reviewLabel } from '../lib/vocabulary/srs.ts';

test('again resets repetition, lowers ease and schedules a short retry', () => {
  const before = Date.now();
  const result = scheduleReview({ intervalDays: 8, repetitionCount: 4, retentionRate: 50, easeFactor: 2.5 }, 'again');
  const delay = new Date(result.nextReviewAt).getTime() - before;
  assert.equal(result.intervalDays, 1);
  assert.equal(result.repetitionCount, 0);
  assert.equal(result.retentionRate, 35);
  assert.equal(result.easeFactor, 2.3);
  assert.ok(delay >= 9 * 60_000 && delay <= 11 * 60_000);
});

test('easy expands the interval, raises ease and clamps retention', () => {
  const result = scheduleReview({ intervalDays: 4, repetitionCount: 2, retentionRate: 95, easeFactor: 2.5 }, 'easy');
  assert.equal(result.intervalDays, 13);
  assert.equal(result.repetitionCount, 3);
  assert.equal(result.retentionRate, 100);
  assert.equal(result.easeFactor, 2.65);
});

test('first good reviews follow 1d, 3d, then ease-based growth', () => {
  const first = scheduleReview({}, 'good');
  assert.equal(first.intervalDays, 1);
  const second = scheduleReview({ ...first }, 'good');
  assert.equal(second.intervalDays, 3);
  const third = scheduleReview({ ...second }, 'good');
  assert.equal(third.intervalDays, 8);
});

test('hard keeps growing slowly and ease never drops below the floor', () => {
  let state = scheduleReview({ intervalDays: 10, repetitionCount: 3, easeFactor: 1.35 }, 'hard');
  assert.equal(state.intervalDays, 12);
  for (let i = 0; i < 10; i++) state = scheduleReview(state, 'again');
  assert.equal(state.easeFactor, 1.3);
});

test('review labels preview the next interval', () => {
  assert.equal(reviewLabel({ intervalDays: 4, repetitionCount: 2 }, 'again'), '10m');
  assert.equal(reviewLabel({ intervalDays: 4, repetitionCount: 2 }, 'good'), '10d');
});
