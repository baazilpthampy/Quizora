/**
 * Pure scoring calculation for Quizora.
 *
 * Scoring model (server-authoritative):
 * - Each question has a configurable maximum point value (`maxPoints`).
 * - An incorrect answer receives 0 points.
 * - A correct answer receives points based on remaining time:
 *     score = maxPoints * (0.5 + 0.5 * remainingTime / totalTime)
 * - The minimum score for a correct answer is 50% of maxPoints.
 * - The maximum score is 100% of maxPoints.
 * - Rounded to the nearest integer.
 */
export function calculateScore(
  maxPoints: number,
  timeLimitSeconds: number,
  timeElapsedSeconds: number,
  isCorrect: boolean
): number {
  if (!isCorrect) {
    return 0;
  }

  // Safety checks for invalid timers
  if (timeLimitSeconds <= 0 || maxPoints <= 0) {
    return 0;
  }

  // Clamp time elapsed between 0 and total time limit
  const clampedElapsed = Math.min(Math.max(0, timeElapsedSeconds), timeLimitSeconds);
  const remainingTime = timeLimitSeconds - clampedElapsed;
  const timeRatio = remainingTime / timeLimitSeconds;

  // Formula: score = maxPoints * (0.5 + 0.5 * remainingTime / totalTime)
  const rawScore = maxPoints * (0.5 + 0.5 * timeRatio);

  // Minimum score for correct answer is 50%, maximum is 100%
  const minScore = Math.round(maxPoints * 0.5);
  const maxScore = maxPoints;

  const rounded = Math.round(rawScore);
  return Math.min(Math.max(minScore, rounded), maxScore);
}
