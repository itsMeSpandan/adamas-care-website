/**
 * lib/scoring-engine.test.ts — Unit tests for the unified scoring engine.
 *
 * These tests exercise the pure `scoreCandidate` function only (no DB).
 * Tests for rankWaitlist / suggestAlternatives require DB fixtures and live
 * in a separate integration test file.
 */
import { describe, it, expect } from "vitest";
import { scoreCandidate, DEFAULT_WEIGHTS } from "./scoring";
import type { ScoringWeights, ScoreInput } from "./scoring";

describe("scoreCandidate", () => {
  it("returns a number", () => {
    const result = scoreCandidate({
      closenessScore: 0.5,
      reliabilityScore: 0.5,
      loadScore: 0.5,
    });
    expect(typeof result).toBe("number");
  });

  it("equal inputs produce equal scores", () => {
    const input: ScoreInput = {
      closenessScore: 0.7,
      reliabilityScore: 0.8,
      loadScore: 0.3,
    };
    const score1 = scoreCandidate(input);
    const score2 = scoreCandidate(input);
    expect(score1).toBe(score2);
  });

  it("higher reliability always increases score all else equal", () => {
    const base: ScoreInput = {
      closenessScore: 0.5,
      reliabilityScore: 0.3,
      loadScore: 0.2,
    };
    const better: ScoreInput = {
      closenessScore: 0.5,
      reliabilityScore: 0.8,
      loadScore: 0.2,
    };
    expect(scoreCandidate(better)).toBeGreaterThan(scoreCandidate(base));
  });

  it("higher closeness always increases score all else equal", () => {
    const low: ScoreInput = {
      closenessScore: 0.1,
      reliabilityScore: 0.5,
      loadScore: 0.2,
    };
    const high: ScoreInput = {
      closenessScore: 0.9,
      reliabilityScore: 0.5,
      loadScore: 0.2,
    };
    expect(scoreCandidate(high)).toBeGreaterThan(scoreCandidate(low));
  });

  it("higher load always decreases score all else equal", () => {
    const light: ScoreInput = {
      closenessScore: 0.5,
      reliabilityScore: 0.5,
      loadScore: 0.1,
    };
    const heavy: ScoreInput = {
      closenessScore: 0.5,
      reliabilityScore: 0.5,
      loadScore: 0.9,
    };
    expect(scoreCandidate(light)).toBeGreaterThan(scoreCandidate(heavy));
  });

  it("uses default weights when not provided", () => {
    const input: ScoreInput = {
      closenessScore: 1,
      reliabilityScore: 1,
      loadScore: 0,
    };
    const expected =
      1 * DEFAULT_WEIGHTS.closeness +
      1 * DEFAULT_WEIGHTS.reliability -
      0 * DEFAULT_WEIGHTS.loadPenalty;
    expect(scoreCandidate(input)).toBeCloseTo(expected);
  });

  it("respects custom weights", () => {
    const weights: ScoringWeights = {
      closeness: 1,
      reliability: 0,
      loadPenalty: 0,
    };
    const input: ScoreInput = {
      closenessScore: 0.8,
      reliabilityScore: 1,
      loadScore: 1,
    };
    // Only closeness matters
    expect(scoreCandidate(input, weights)).toBeCloseTo(0.8);
  });

  it("perfect input scores at the weight maximum", () => {
    const input: ScoreInput = {
      closenessScore: 1,
      reliabilityScore: 1,
      loadScore: 0,
    };
    const score = scoreCandidate(input);
    const maxScore =
      DEFAULT_WEIGHTS.closeness + DEFAULT_WEIGHTS.reliability;
    expect(score).toBeCloseTo(maxScore);
  });

  it("worst input scores negative", () => {
    const input: ScoreInput = {
      closenessScore: 0,
      reliabilityScore: 0,
      loadScore: 1,
    };
    const score = scoreCandidate(input);
    expect(score).toBeLessThan(0);
  });

  it("handles boundary values (all zeros)", () => {
    expect(scoreCandidate({ closenessScore: 0, reliabilityScore: 0, loadScore: 0 })).toBe(0);
  });

  it("handles boundary values (all ones)", () => {
    const score = scoreCandidate({ closenessScore: 1, reliabilityScore: 1, loadScore: 1 });
    // 1*0.4 + 1*0.4 - 1*0.2 = 0.6
    expect(score).toBeCloseTo(0.6);
  });

  it("transitivity: if A > B on all dimensions, A scores higher", () => {
    const a: ScoreInput = { closenessScore: 0.9, reliabilityScore: 0.9, loadScore: 0.1 };
    const b: ScoreInput = { closenessScore: 0.5, reliabilityScore: 0.5, loadScore: 0.5 };
    expect(scoreCandidate(a)).toBeGreaterThan(scoreCandidate(b));
  });

  it("symmetry: swapping closeness and reliability with equal weights gives same score", () => {
    const weights: ScoringWeights = { closeness: 0.5, reliability: 0.5, loadPenalty: 0 };
    const x: ScoreInput = { closenessScore: 0.3, reliabilityScore: 0.7, loadScore: 0 };
    const y: ScoreInput = { closenessScore: 0.7, reliabilityScore: 0.3, loadScore: 0 };
    expect(scoreCandidate(x, weights)).toBeCloseTo(scoreCandidate(y, weights));
  });
});
