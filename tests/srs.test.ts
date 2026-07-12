import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleReview } from '../lib/vocabulary/srs.ts';

test('again resets repetition and schedules a short retry', () => {
  const before = Date.now();
  const result = scheduleReview({ intervalDays: 8, repetitionCount: 4, retentionRate: 50 }, 'again');
  const delay = new Date(result.nextReviewAt).getTime() - before;
  assert.equal(result.intervalDays, 1);
  assert.equal(result.repetitionCount, 0);
  assert.equal(result.retentionRate, 35);
  assert.ok(delay >= 9 * 60_000 && delay <= 11 * 60_000);
});

test('easy expands the interval and clamps retention', () => {
  const result = scheduleReview({ intervalDays: 4, repetitionCount: 2, retentionRate: 95 }, 'easy');
  assert.equal(result.intervalDays, 12);
  assert.equal(result.repetitionCount, 3);
  assert.equal(result.retentionRate, 100);
});
