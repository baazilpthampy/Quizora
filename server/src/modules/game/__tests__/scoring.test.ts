import { describe, it, expect } from 'vitest';
import { calculateScore } from '../scoring';

describe('calculateScore', () => {
  it('returns 0 for incorrect answers regardless of speed', () => {
    expect(calculateScore(1000, 20, 0, false)).toBe(0);
    expect(calculateScore(1000, 20, 10, false)).toBe(0);
    expect(calculateScore(1000, 20, 20, false)).toBe(0);
  });

  it('awards 100% of maxPoints for answering instantly (0 seconds elapsed)', () => {
    const score = calculateScore(1000, 20, 0, true);
    expect(score).toBe(1000);
  });

  it('awards 50% of maxPoints for answering at the very last second', () => {
    const score = calculateScore(1000, 20, 20, true);
    expect(score).toBe(500);
  });

  it('awards 75% of maxPoints for answering exactly halfway through the timer', () => {
    // halfway: remainingTime / totalTime = 10 / 20 = 0.5
    // 0.5 + 0.5 * 0.5 = 0.75
    // 1000 * 0.75 = 750
    const score = calculateScore(1000, 20, 10, true);
    expect(score).toBe(750);
  });

  it('clamps correctly when timeElapsed is negative or exceeds timeLimit', () => {
    // Negative elapsed -> treated as 0 elapsed -> max points
    expect(calculateScore(1000, 20, -5, true)).toBe(1000);

    // Overtime elapsed -> treated as total elapsed -> 50% points
    expect(calculateScore(1000, 20, 30, true)).toBe(500);
  });

  it('handles arbitrary point values and timers accurately with rounding', () => {
    // maxPoints 500, timeLimit 30, elapsed 6s -> remaining = 24s -> ratio = 24/30 = 0.8
    // 500 * (0.5 + 0.5 * 0.8) = 500 * (0.5 + 0.4) = 500 * 0.9 = 450
    expect(calculateScore(500, 30, 6, true)).toBe(450);
  });

  it('returns 0 if maxPoints or timeLimit are non-positive', () => {
    expect(calculateScore(0, 20, 5, true)).toBe(0);
    expect(calculateScore(1000, 0, 0, true)).toBe(0);
    expect(calculateScore(-100, 20, 5, true)).toBe(0);
  });
});
