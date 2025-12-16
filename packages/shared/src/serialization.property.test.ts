import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  serializeApplication,
  deserializeApplication,
  serializeCategory,
  deserializeCategory,
  serializeBudgetConfig,
  deserializeBudgetConfig,
} from './serialization';
import type { Application, Category, BudgetConfig, ApplicationStatus } from './types';

// **Feature: grant-manager, Property 14: Data serialization round-trip**
// **Validates: Requirements 9.3**

// Arbitraries for generating test data
const applicationStatusArb: fc.Arbitrary<ApplicationStatus> = fc.constantFrom(
  'draft',
  'submitted',
  'categorized',
  'under_review',
  'feedback_requested',
  'approved',
  'rejected'
);

const criterionScoreArb = fc.record({
  criterionId: fc.uuid(),
  criterionName: fc.string({ minLength: 1 }),
  score: fc.integer({ min: 0, max: 100 }),
  weight: fc.integer({ min: 0, max: 100 }),
  weightedScore: fc.float({ min: 0, max: 100, noNaN: true }),
  reasoning: fc.string({ minLength: 1 }),
});

const applicationArb: fc.Arbitrary<Application> = fc.record({
  id: fc.uuid(),
  referenceNumber: fc.string({ minLength: 1 }),
  applicantName: fc.string({ minLength: 1 }),
  applicantEmail: fc.emailAddress(),
  projectTitle: fc.string({ minLength: 1 }),
  projectDescription: fc.string({ minLength: 1 }),
  requestedAmount: fc.float({ min: 0, max: 1000000, noNaN: true }),
  status: applicationStatusArb,
  submittedAt: fc.date(),
  updatedAt: fc.date(),
  categoryId: fc.option(fc.uuid(), { nil: null }),
  categorizationExplanation: fc.option(fc.string(), { nil: null }),
  categorizationConfidence: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
  rankingScore: fc.option(fc.float({ min: 0, max: 100, noNaN: true }), { nil: null }),
  rankingBreakdown: fc.option(fc.array(criterionScoreArb), { nil: null }),
  decision: fc.option(fc.constantFrom('approved' as const, 'rejected' as const), { nil: null }),
  decisionReason: fc.option(fc.string(), { nil: null }),
  decidedAt: fc.option(fc.date(), { nil: null }),
  attachments: fc.constant([]),
  feedbackComments: fc.option(fc.string(), { nil: null }),
  feedbackRequestedAt: fc.option(fc.date(), { nil: null }),
});

const categoryArb: fc.Arbitrary<Category> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1 }),
  description: fc.string(),
  allocatedBudget: fc.float({ min: 0, max: 10000000, noNaN: true }),
  spentBudget: fc.float({ min: 0, max: 10000000, noNaN: true }),
  isActive: fc.boolean(),
});

const budgetConfigArb: fc.Arbitrary<BudgetConfig> = fc.record({
  fiscalYear: fc.integer({ min: 2020, max: 2030 }),
  totalBudget: fc.float({ min: 0, max: 100000000, noNaN: true }),
  categories: fc.array(categoryArb, { minLength: 0, maxLength: 10 }),
});

describe('Serialization Round-Trip Properties', () => {
  it('Application: serialize then deserialize produces equivalent object', () => {
    fc.assert(
      fc.property(applicationArb, (application) => {
        const serialized = serializeApplication(application);
        const deserialized = deserializeApplication(serialized);

        expect(deserialized.id).toBe(application.id);
        expect(deserialized.referenceNumber).toBe(application.referenceNumber);
        expect(deserialized.applicantName).toBe(application.applicantName);
        expect(deserialized.applicantEmail).toBe(application.applicantEmail);
        expect(deserialized.projectTitle).toBe(application.projectTitle);
        expect(deserialized.projectDescription).toBe(application.projectDescription);
        expect(deserialized.requestedAmount).toBeCloseTo(application.requestedAmount, 2);
        expect(deserialized.status).toBe(application.status);
        expect(deserialized.submittedAt.getTime()).toBe(application.submittedAt.getTime());
        expect(deserialized.updatedAt.getTime()).toBe(application.updatedAt.getTime());
        expect(deserialized.categoryId).toBe(application.categoryId);
        expect(deserialized.decision).toBe(application.decision);
      }),
      { numRuns: 100 }
    );
  });

  it('Category: serialize then deserialize produces equivalent object', () => {
    fc.assert(
      fc.property(categoryArb, (category) => {
        const serialized = serializeCategory(category);
        const deserialized = deserializeCategory(serialized);

        expect(deserialized.id).toBe(category.id);
        expect(deserialized.name).toBe(category.name);
        expect(deserialized.description).toBe(category.description);
        expect(deserialized.allocatedBudget).toBeCloseTo(category.allocatedBudget, 2);
        expect(deserialized.spentBudget).toBeCloseTo(category.spentBudget, 2);
        expect(deserialized.isActive).toBe(category.isActive);
      }),
      { numRuns: 100 }
    );
  });

  it('BudgetConfig: serialize then deserialize produces equivalent object', () => {
    fc.assert(
      fc.property(budgetConfigArb, (config) => {
        const serialized = serializeBudgetConfig(config);
        const deserialized = deserializeBudgetConfig(serialized);

        expect(deserialized.fiscalYear).toBe(config.fiscalYear);
        expect(deserialized.totalBudget).toBeCloseTo(config.totalBudget, 2);
        expect(deserialized.categories.length).toBe(config.categories.length);

        for (let i = 0; i < config.categories.length; i++) {
          expect(deserialized.categories[i].id).toBe(config.categories[i].id);
          expect(deserialized.categories[i].name).toBe(config.categories[i].name);
        }
      }),
      { numRuns: 100 }
    );
  });
});
