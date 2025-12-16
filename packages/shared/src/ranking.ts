import type { RankingCriterion, CriterionScore, Application, RankedApplication } from './types';

export function normalizeWeights(criteria: RankingCriterion[]): RankingCriterion[] {
  if (criteria.length === 0) return [];

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) {
    // Equal distribution if all weights are zero
    const equalWeight = 100 / criteria.length;
    return criteria.map((c) => ({ ...c, weight: equalWeight }));
  }

  const factor = 100 / totalWeight;
  return criteria.map((c) => ({
    ...c,
    weight: c.weight * factor,
  }));
}

export function calculateTotalScore(breakdown: CriterionScore[]): number {
  return breakdown.reduce((sum, cs) => sum + cs.weightedScore, 0);
}

export function calculateWeightedScore(score: number, weight: number): number {
  return (score * weight) / 100;
}

export function createCriterionScore(
  criterion: RankingCriterion,
  score: number,
  reasoning: string
): CriterionScore {
  const weightedScore = calculateWeightedScore(score, criterion.weight);
  return {
    criterionId: criterion.id,
    criterionName: criterion.name,
    score,
    weight: criterion.weight,
    weightedScore,
    reasoning,
  };
}

export function rankApplications(
  applications: Application[],
  scoredApplications: Map<string, CriterionScore[]>
): RankedApplication[] {
  const ranked: RankedApplication[] = applications.map((app) => {
    const breakdown = scoredApplications.get(app.id) ?? [];
    const totalScore = calculateTotalScore(breakdown);
    return {
      application: app,
      totalScore,
      breakdown,
      rank: 0, // Will be set after sorting
    };
  });

  // Sort by total score descending
  ranked.sort((a, b) => b.totalScore - a.totalScore);

  // Assign ranks
  ranked.forEach((r, index) => {
    r.rank = index + 1;
  });

  return ranked;
}

export function validateRankingBreakdown(breakdown: CriterionScore[]): boolean {
  return breakdown.every(
    (cs) =>
      typeof cs.criterionId === 'string' &&
      typeof cs.criterionName === 'string' &&
      typeof cs.score === 'number' &&
      cs.score >= 0 &&
      cs.score <= 100 &&
      typeof cs.weight === 'number' &&
      typeof cs.weightedScore === 'number' &&
      typeof cs.reasoning === 'string' &&
      cs.reasoning.length > 0
  );
}

export function isSortedDescending(ranked: RankedApplication[]): boolean {
  for (let i = 1; i < ranked.length; i++) {
    if (ranked[i].totalScore > ranked[i - 1].totalScore) {
      return false;
    }
  }
  return true;
}
