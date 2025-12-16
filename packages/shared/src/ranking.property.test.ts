import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  normalizeWeights,
  calculateTotalScore,
  calculateWeightedScore,
  createCriterionScore,
  rankApplications,
  isSortedDescending,
} from './ranking';
import type { RankingCriterion, CriterionScore } from './types';

const criterionArb: fc.Arbitrary<RankingCriterion> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1 }),
  description: fc.string(),
  weight: fc.float({ min: 0, max: 100, noNaN: true }),
  categoryId: fc.option(fc.uuid(), { nil: null }),
});

const criterionScoreArb: fc.Arbitrary<CriterionScore> = fc.record({
  criterionId: fc.uuid(),
  criterionName: fc.string({ minLength: 1 }),
  score: fc.float({ min: 0, max: 100, noNaN: true }),
  weight: fc.float({ min: 0, max: 100, noNaN: true }),
  weightedScore: fc.float({ min: 0, max: 100, noNaN: true }),
  reasoning: fc.string({ minLength: 1 }),
});

// **Feature: grant-manager, Property 6: Criteria weight normalization**
// **Validates: Requirements 5.3**
describe('Property 6: Criteria weight normalization', () => {
  it('normalized weights sum to exactly 100', () => {
    fc.assert(
      fc.property(
        fc.array(criterionArb, { minLength: 1, maxLength: 10 }),
        (criteria) => {
          const normalized = normalizeWeights(criteria);
          const sum = normalized.reduce((s, c) => s + c.weight, 0);
          expect(sum).toBeCloseTo(100, 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty criteria returns empty array', () => {
    const result = normalizeWeights([]);
    expect(result).toHaveLength(0);
  });
});

// **Feature: grant-manager, Property 7: Ranking score calculation consistency**
// **Validates: Requirements 6.1, 6.2, 6.3**
describe('Property 7: Ranking score calculation consistency', () => {
  it('total score equals sum of weighted scores', () => {
    fc.assert(
      fc.property(
        fc.array(criterionScoreArb, { minLength: 1, maxLength: 5 }),
        (breakdown) => {
          // Recalculate weighted scores to ensure consistency
          const correctedBreakdown = breakdown.map((cs) => ({
            ...cs,
            weightedScore: calculateWeightedScore(cs.score, cs.weight),
          }));
          const total = calculateTotalScore(correctedBreakdown);
          const expectedSum = correctedBreakdown.reduce((s, cs) => s + cs.weightedScore, 0);
          expect(total).toBeCloseTo(expectedSum, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ranked applications are sorted in descending order by score', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            referenceNumber: fc.string({ minLength: 1 }),
            applicantName: fc.string({ minLength: 1 }),
            applicantEmail: fc.emailAddress(),
            projectTitle: fc.string({ minLength: 1 }),
            projectDescription: fc.string({ minLength: 1 }),
            requestedAmount: fc.float({ min: 100, max: 10000, noNaN: true }),
            status: fc.constant('submitted' as const),
            submittedAt: fc.date(),
            updatedAt: fc.date(),
            categoryId: fc.option(fc.uuid(), { nil: null }),
            categorizationExplanation: fc.constant(null),
            categorizationConfidence: fc.constant(null),
            rankingScore: fc.constant(null),
            rankingBreakdown: fc.constant(null),
            decision: fc.constant(null),
            decisionReason: fc.constant(null),
            decidedAt: fc.constant(null),
            attachments: fc.constant([]),
            feedbackHistory: fc.constant([]),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (applications) => {
          // Create random scores for each application
          const scoredApps = new Map<string, CriterionScore[]>();
          applications.forEach((app) => {
            const score = Math.random() * 100;
            scoredApps.set(app.id, [
              {
                criterionId: 'c1',
                criterionName: 'Test',
                score,
                weight: 100,
                weightedScore: score,
                reasoning: 'Test reasoning',
              },
            ]);
          });

          const ranked = rankApplications(applications, scoredApps);
          expect(isSortedDescending(ranked)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('createCriterionScore', () => {
  it('calculates weighted score correctly', () => {
    fc.assert(
      fc.property(
        criterionArb,
        fc.float({ min: 0, max: 100, noNaN: true }),
        fc.string({ minLength: 1 }),
        (criterion, score, reasoning) => {
          const result = createCriterionScore(criterion, score, reasoning);
          const expectedWeighted = (score * criterion.weight) / 100;
          expect(result.weightedScore).toBeCloseTo(expectedWeighted, 2);
          expect(result.reasoning).toBe(reasoning);
        }
      ),
      { numRuns: 100 }
    );
  });
});
