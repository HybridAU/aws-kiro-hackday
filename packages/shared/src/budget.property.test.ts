import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateRemainingBudget,
  calculateUnallocatedBudget,
  isThresholdReached,
  validateBudgetAllocation,
  checkApprovalBudgetWarning,
  applyApprovalToCategory,
} from './budget';
import type { Category } from './types';

const categoryArb: fc.Arbitrary<Category> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1 }),
  description: fc.string(),
  allocatedBudget: fc.float({ min: 0, max: 1000000, noNaN: true }),
  spentBudget: fc.float({ min: 0, max: 1000000, noNaN: true }),
  isActive: fc.boolean(),
});

// **Feature: grant-manager, Property 3: Budget allocation invariant**
// **Validates: Requirements 3.3**
describe('Property 3: Budget allocation invariant', () => {
  it('sum of allocated + unallocated equals total budget', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 10000000, noNaN: true }),
        fc.array(categoryArb, { minLength: 0, maxLength: 10 }),
        (totalBudget, categories) => {
          const totalAllocated = categories.reduce((sum, c) => sum + c.allocatedBudget, 0);
          const unallocated = calculateUnallocatedBudget(totalBudget, categories);
          expect(totalAllocated + unallocated).toBeCloseTo(totalBudget, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// **Feature: grant-manager, Property 4: Budget overallocation prevention**
// **Validates: Requirements 3.4**
describe('Property 4: Budget overallocation prevention', () => {
  it('allocations exceeding budget return failure', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1000, max: 100000, noNaN: true }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1 }),
            description: fc.string(),
            allocatedBudget: fc.float({ min: 10000, max: 50000, noNaN: true }),
            spentBudget: fc.constant(0),
            isActive: fc.constant(true),
          }),
          { minLength: 3, maxLength: 5 }
        ),
        (totalBudget, categories) => {
          const totalAllocated = categories.reduce((sum, c) => sum + c.allocatedBudget, 0);
          if (totalAllocated > totalBudget) {
            const result = validateBudgetAllocation(totalBudget, categories);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// **Feature: grant-manager, Property 10: Remaining budget calculation**
// **Validates: Requirements 7.3**
describe('Property 10: Remaining budget calculation', () => {
  it('remaining equals allocated minus spent', () => {
    fc.assert(
      fc.property(categoryArb, (category) => {
        const remaining = calculateRemainingBudget(category);
        expect(remaining).toBeCloseTo(category.allocatedBudget - category.spentBudget, 2);
      }),
      { numRuns: 100 }
    );
  });
});

// **Feature: grant-manager, Property 13: Budget threshold detection**
// **Validates: Requirements 8.4**
describe('Property 13: Budget threshold detection', () => {
  it('threshold reached when spent >= 80% of allocated', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1000, max: 100000, noNaN: true }),
        fc.float({ min: Math.fround(0.8), max: Math.fround(1.0), noNaN: true }),
        (allocated, spentRatio) => {
          const category: Category = {
            id: 'test',
            name: 'Test',
            description: '',
            allocatedBudget: allocated,
            spentBudget: allocated * spentRatio,
            isActive: true,
          };
          expect(isThresholdReached(category)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('threshold not reached when spent < 80% of allocated', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1000, max: 100000, noNaN: true }),
        fc.float({ min: 0, max: Math.fround(0.79), noNaN: true }),
        (allocated, spentRatio) => {
          const category: Category = {
            id: 'test',
            name: 'Test',
            description: '',
            allocatedBudget: allocated,
            spentBudget: allocated * spentRatio,
            isActive: true,
          };
          expect(isThresholdReached(category)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// **Feature: grant-manager, Property 9: Budget deduction on approval**
// **Validates: Requirements 7.1**
describe('Property 9: Budget deduction on approval', () => {
  it('approval increases spent budget by requested amount', () => {
    fc.assert(
      fc.property(
        categoryArb,
        fc.float({ min: 0, max: 10000, noNaN: true }),
        (category, amount) => {
          const originalSpent = category.spentBudget;
          const updated = applyApprovalToCategory(category, amount);
          expect(updated.spentBudget).toBeCloseTo(originalSpent + amount, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// **Feature: grant-manager, Property 11: Budget warning threshold**
// **Validates: Requirements 7.4**
describe('Property 11: Budget warning threshold', () => {
  it('warning when requested exceeds remaining', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1000, max: 10000, noNaN: true }),
        fc.float({ min: 0, max: 500, noNaN: true }),
        fc.float({ min: 600, max: 2000, noNaN: true }),
        (allocated, spent, requested) => {
          const category: Category = {
            id: 'test',
            name: 'Test',
            description: '',
            allocatedBudget: allocated,
            spentBudget: spent,
            isActive: true,
          };
          const remaining = allocated - spent;
          if (requested > remaining) {
            const result = checkApprovalBudgetWarning(category, requested);
            expect(result.warning).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
