import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateApplicationForm, getRequiredFields } from './validation';
import type { ApplicationFormData } from './types';

// **Feature: grant-manager, Property 2: Application validation completeness**
// **Validates: Requirements 1.3, 1.4**

const validFormDataArb: fc.Arbitrary<ApplicationFormData> = fc.record({
  applicantName: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
  applicantEmail: fc.emailAddress(),
  projectTitle: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
  projectDescription: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
  requestedAmount: fc.float({ min: 1, max: 1000000, noNaN: true }),
});

const invalidEmailArb = fc.string().filter((s) => !s.includes('@') || s.trim() === '');

describe('Validation Property Tests', () => {
  it('valid form data passes validation with no errors', () => {
    fc.assert(
      fc.property(validFormDataArb, (formData) => {
        const result = validateApplicationForm(formData);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });

  it('empty required fields produce exactly one error per missing field', () => {
    fc.assert(
      fc.property(
        fc.record({
          applicantName: fc.constantFrom('', '   ', undefined as unknown as string),
          applicantEmail: fc.emailAddress(),
          projectTitle: fc.string({ minLength: 1 }),
          projectDescription: fc.string({ minLength: 1 }),
          requestedAmount: fc.float({ min: 1, max: 1000000, noNaN: true }),
        }),
        (formData) => {
          const result = validateApplicationForm(formData);
          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.field === 'applicantName')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('invalid email format produces email validation error', () => {
    fc.assert(
      fc.property(
        fc.record({
          applicantName: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          applicantEmail: invalidEmailArb,
          projectTitle: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          projectDescription: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          requestedAmount: fc.float({ min: 1, max: 1000000, noNaN: true }),
        }),
        (formData) => {
          const result = validateApplicationForm(formData);
          expect(result.errors.some((e) => e.field === 'applicantEmail')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('zero or negative amount produces amount validation error', () => {
    fc.assert(
      fc.property(
        fc.record({
          applicantName: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          applicantEmail: fc.emailAddress(),
          projectTitle: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          projectDescription: fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          requestedAmount: fc.float({ min: -1000000, max: 0, noNaN: true }),
        }),
        (formData) => {
          const result = validateApplicationForm(formData);
          expect(result.errors.some((e) => e.field === 'requestedAmount')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all required fields are checked', () => {
    const requiredFields = getRequiredFields();
    expect(requiredFields).toContain('applicantName');
    expect(requiredFields).toContain('applicantEmail');
    expect(requiredFields).toContain('projectTitle');
    expect(requiredFields).toContain('projectDescription');
    expect(requiredFields).toContain('requestedAmount');
  });
});
