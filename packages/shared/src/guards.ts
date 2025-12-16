import type {
  Application,
  ApplicationStatus,
  Category,
  RankingCriterion,
  CriterionScore,
  BudgetConfig,
  ApplicationFormData,
  FieldUpdate,
  CategorizationResult,
} from './types';

// Valid application statuses
const APPLICATION_STATUSES: ApplicationStatus[] = [
  'draft',
  'submitted',
  'categorized',
  'under_review',
  'approved',
  'rejected',
];

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string' && APPLICATION_STATUSES.includes(value as ApplicationStatus);
}

export function isApplication(value: unknown): value is Application {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.referenceNumber === 'string' &&
    typeof obj.applicantName === 'string' &&
    typeof obj.applicantEmail === 'string' &&
    typeof obj.projectTitle === 'string' &&
    typeof obj.projectDescription === 'string' &&
    typeof obj.requestedAmount === 'number' &&
    isApplicationStatus(obj.status) &&
    (obj.submittedAt instanceof Date || typeof obj.submittedAt === 'string') &&
    (obj.updatedAt instanceof Date || typeof obj.updatedAt === 'string')
  );
}

export function isCategory(value: unknown): value is Category {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.allocatedBudget === 'number' &&
    typeof obj.spentBudget === 'number' &&
    typeof obj.isActive === 'boolean'
  );
}

export function isRankingCriterion(value: unknown): value is RankingCriterion {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.weight === 'number' &&
    (obj.categoryId === null || typeof obj.categoryId === 'string')
  );
}

export function isCriterionScore(value: unknown): value is CriterionScore {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.criterionId === 'string' &&
    typeof obj.criterionName === 'string' &&
    typeof obj.score === 'number' &&
    typeof obj.weight === 'number' &&
    typeof obj.weightedScore === 'number' &&
    typeof obj.reasoning === 'string'
  );
}

export function isBudgetConfig(value: unknown): value is BudgetConfig {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.fiscalYear === 'number' &&
    typeof obj.totalBudget === 'number' &&
    Array.isArray(obj.categories) &&
    obj.categories.every(isCategory)
  );
}

export function isApplicationFormData(value: unknown): value is ApplicationFormData {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.applicantName === 'string' &&
    typeof obj.applicantEmail === 'string' &&
    typeof obj.projectTitle === 'string' &&
    typeof obj.projectDescription === 'string' &&
    typeof obj.requestedAmount === 'number'
  );
}

export function isFieldUpdate(value: unknown): value is FieldUpdate {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.field === 'string' &&
    typeof obj.value === 'string' &&
    typeof obj.confidence === 'number'
  );
}

export function isCategorizationResult(value: unknown): value is CategorizationResult {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.categoryId === 'string' &&
    typeof obj.categoryName === 'string' &&
    typeof obj.explanation === 'string' &&
    typeof obj.confidence === 'number' &&
    obj.confidence >= 0 &&
    obj.confidence <= 100
  );
}
