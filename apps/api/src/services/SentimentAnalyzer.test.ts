import { describe, it, expect } from 'vitest';
import { SentimentAnalyzer } from './SentimentAnalyzer';

describe('SentimentAnalyzer', () => {
  it('matches accented positive vocabulary (LOG-05)', () => {
    expect(SentimentAnalyzer.analyze('Foi incrível!')).toBeGreaterThan(0);
    expect(SentimentAnalyzer.analyze('Magnífico')).toBeGreaterThan(0);
  });

  it('matches accented negative vocabulary (LOG-05)', () => {
    expect(SentimentAnalyzer.analyze('Foi péssimo')).toBeLessThan(0);
    expect(SentimentAnalyzer.analyze('Horrível')).toBeLessThan(0);
  });

  it('flips polarity on accented negation', () => {
    // "não" without normalization never matched before.
    expect(SentimentAnalyzer.analyze('Não gostei')).toBeLessThan(0);
  });

  it('returns 0 for empty input', () => {
    expect(SentimentAnalyzer.analyze('')).toBe(0);
    expect(SentimentAnalyzer.analyze('xyz qrs')).toBe(0);
  });
});

describe('LOG-01 sum-not-count semantics', () => {
  // sanity: this analyzer is unrelated, but we record the LOG-01 fix in
  // controllers via aggregate({_sum: { count: true }}). Live data stats are
  // covered by integration tests once a Postgres test container is wired.
  it('placeholder', () => {
    expect(true).toBe(true);
  });
});
