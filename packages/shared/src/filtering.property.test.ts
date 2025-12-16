import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { filterApplications, matchesFilter } from './filtering';
import type { Application, ApplicationStatus, ApplicationFilters } from './types';

// **Feature: grant-manager, Property 12: Filter result correctness**
// **Validates: Requirements 8.3**

const applicationStatusArb: fc.Arbitrary<ApplicationStatus> = fc.constantFrom(
  'draft',
  'submitted',
  'categorized',
  'under_review',
  'approved',
  'rejected'
);

const applicationArb: fc.Arbitrary<Application> = fc.record({
  id: fc.uuid(),
  referenceNumber: fc.string({ minLength: 1 }),
  applicantName: fc.string({ minLength: 1 }),
  applicantEmail: fc.emailAddress(),
  projectTitle: fc.string({ minLength: 1 }),
  projectDescription: fc.string({ minLength: 1 }),
  requestedAmount: fc.float({ min: 100, max: 10000, noNaN: true }),
  status: applicationStatusArb,
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
});

describe('Property 12: Filter result correctness', () => {
  it('all filtered results match the category filter', () => {
    fc.assert(
      fc.property(
        fc.array(applicationArb, { minLength: 1, maxLength: 20 }),
        fc.uuid(),
        (applications, categoryId) => {
          const filters: ApplicationFilters = { categoryId };
          const results = filterApplications(applications, filters);

          // All results must have the specified categoryId
          results.forEach((app) => {
            expect(app.categoryId).toBe(categoryId);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all filtered results match the status filter', () => {
    fc.assert(
      fc.property(
        fc.array(applicationArb, { minLength: 1, maxLength: 20 }),
        applicationStatusArb,
        (applications, status) => {
          const filters: ApplicationFilters = { status };
          const results = filterApplications(applications, filters);

          // All results must have the specified status
          results.forEach((app) => {
            expect(app.status).toBe(status);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('combined filters use AND logic', () => {
    fc.assert(
      fc.property(
        fc.array(applicationArb, { minLength: 1, maxLength: 20 }),
        fc.uuid(),
        applicationStatusArb,
        (applications, categoryId, status) => {
          const filters: ApplicationFilters = { categoryId, status };
          const results = filterApplications(applications, filters);

          // All results must match BOTH filters
          results.forEach((app) => {
            expect(app.categoryId).toBe(categoryId);
            expect(app.status).toBe(status);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('matchesFilter is consistent with filterApplications', () => {
    fc.assert(
      fc.property(
        applicationArb,
        fc.record({
          categoryId: fc.option(fc.uuid(), { nil: undefined }),
          status: fc.option(applicationStatusArb, { nil: undefined }),
        }),
        (app, filters) => {
          const filtered = filterApplications([app], filters);
          const matches = matchesFilter(app, filters);

          expect(matches).toBe(filtered.length === 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
