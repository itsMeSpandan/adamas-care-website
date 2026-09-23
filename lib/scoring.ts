/**
 * lib/scoring.ts — Pure, side-effect-free scoring function.
 *
 * Zero dependencies on Prisma, DB, or any external state.
 * Imported by both the waitlist-ranking and slot-suggestion modules
 * to guarantee there is exactly ONE scoring implementation.
 *
 * Final score = closeness * w.closeness + reliability * w.reliability
 *             - loadScore * w.loadPenalty
 *
 * Weights should sum to 1 for interpretability but this is not enforced.
 */

export interface ScoringWeights {
  closeness: number; // default 0.4
  reliability: number; // default 0.4
  loadPenalty: number; // default 0.2
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  closeness: 0.4,
  reliability: 0.4,
  loadPenalty: 0.2,
};

export interface ScoreInput {
  closenessScore: number; // 0–1, higher = better
  reliabilityScore: number; // 0–1, higher = better
  loadScore: number; // 0–1, higher = more loaded / worse
}

/**
 * Pure, side-effect-free scoring function.
 * All inputs must be normalized 0–1 before being passed in —
 * normalization happens in the caller, not here.
 */
export function scoreCandidate(
  input: ScoreInput,
  weights: ScoringWeights = DEFAULT_WEIGHTS
): number {
  return (
    input.closenessScore * weights.closeness +
    input.reliabilityScore * weights.reliability -
    input.loadScore * weights.loadPenalty
  );
}
