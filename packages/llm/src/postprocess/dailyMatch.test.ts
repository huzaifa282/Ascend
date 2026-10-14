import { describe, expect, it } from 'vitest';
import { jaccardSimilarity, matchDaily } from './dailyMatch';

describe('jaccardSimilarity', () => {
  it('is 1 for identical text', () => {
    expect(jaccardSimilarity('Read 20 pages', 'read 20 pages')).toBe(1);
  });

  it('is 0 for completely different text', () => {
    expect(jaccardSimilarity('Read 20 pages', 'go for a swim')).toBe(0);
  });

  it('is partial for overlapping but not identical phrases', () => {
    const score = jaccardSimilarity('Read 20 pages of my book', 'Read 20 pages');
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

describe('matchDaily', () => {
  const dailies = [
    { id: 'd1', title: 'Read 20 pages', doneToday: false },
    { id: 'd2', title: 'Train 30 minutes', doneToday: false },
    { id: 'd3', title: 'In bed before 23:30', doneToday: true },
  ];

  it('accepts the model-provided id when valid and not already done', () => {
    const result = matchDaily('Read some of my book', 'd1', dailies);
    expect(result).toEqual({ dailyId: 'd1', title: 'Read 20 pages', fromModel: true });
  });

  it('rejects the model-provided id when that daily is already done today', () => {
    const result = matchDaily('went to bed early', 'd3', dailies);
    expect(result?.fromModel).not.toBe(true);
  });

  it('falls back to fuzzy matching when no id is given', () => {
    const result = matchDaily('Read 20 pages of my book', null, dailies);
    expect(result).toMatchObject({ dailyId: 'd1', fromModel: false });
  });

  it('returns null when nothing matches well enough', () => {
    const result = matchDaily('went grocery shopping', null, dailies);
    expect(result).toBeNull();
  });

  it('never suggests a daily that is already done today', () => {
    const result = matchDaily('went to bed before 23:30', null, dailies);
    expect(result?.dailyId).not.toBe('d3');
  });
});
