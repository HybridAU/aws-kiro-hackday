import type { Category, BudgetConfig, BudgetStatus, CategoryBudgetStatus } from './types';

const THRESHOLD_PERCENT = 0.8;

export interface BudgetAllocationResult {
  success: boolean;
  error?: string;
  totalAllocated?: number;
  remaining?: number;
}

export function calculateRemainingBudget(category: Category): number {
  return category.allocatedBudget - category.spentBudget;
}

export function calculateUnallocatedBudget(totalBudget: number, categories: Category[]): number {
  const totalAllocated = categories.reduce((sum, cat) => sum + cat.allocatedBudget, 0);
  return totalBudget - totalAllocated;
}

export function isThresholdReached(category: Category): boolean {
  if (category.allocatedBudget === 0) return false;
  return category.spentBudget / category.allocatedBudget >= THRESHOLD_PERCENT;
}

export function validateBudgetAllocation(
  totalBudget: number,
  categories: Category[]
): BudgetAllocationResult {
  const totalAllocated = categories.reduce((sum, cat) => sum + cat.allocatedBudget, 0);

  if (totalAllocated > totalBudget) {
    return {
      success: false,
      error: `Total allocations ($${totalAllocated.toFixed(2)}) exceed yearly budget ($${totalBudget.toFixed(2)})`,
      totalAllocated,
      remaining: totalBudget - totalAllocated,
    };
  }

  return {
    success: true,
    totalAllocated,
    remaining: totalBudget - totalAllocated,
  };
}

export function checkApprovalBudgetWarning(
  category: Category,
  requestedAmount: number
): { warning: boolean; message?: string } {
  const remaining = calculateRemainingBudget(category);

  if (requestedAmount > remaining) {
    return {
      warning: true,
      message: `Approval amount ($${requestedAmount.toFixed(2)}) exceeds remaining budget ($${remaining.toFixed(2)}) for category "${category.name}"`,
    };
  }

  return { warning: false };
}

export function applyApprovalToCategory(category: Category, amount: number): Category {
  return {
    ...category,
    spentBudget: category.spentBudget + amount,
  };
}

export function getBudgetStatus(config: BudgetConfig, pendingCounts: Map<string, number>): BudgetStatus {
  const totalAllocated = config.categories.reduce((sum, cat) => sum + cat.allocatedBudget, 0);
  const totalSpent = config.categories.reduce((sum, cat) => sum + cat.spentBudget, 0);

  const categoryStatuses: CategoryBudgetStatus[] = config.categories.map((category) => ({
    category,
    remaining: calculateRemainingBudget(category),
    percentSpent:
      category.allocatedBudget > 0
        ? (category.spentBudget / category.allocatedBudget) * 100
        : 0,
    thresholdReached: isThresholdReached(category),
    pendingApplications: pendingCounts.get(category.id) ?? 0,
  }));

  return {
    fiscalYear: config.fiscalYear,
    totalBudget: config.totalBudget,
    totalAllocated,
    totalSpent,
    unallocated: config.totalBudget - totalAllocated,
    categories: categoryStatuses,
  };
}
