import { describe, it, expect } from 'vitest';
import {
  serializeApplication,
  deserializeApplication,
  serializeCategory,
  deserializeCategory,
  SerializationError,
} from './serialization';
import type { Application, Category } from './types';

describe('Serialization Edge Cases', () => {
  describe('deserializeApplication', () => {
    it('throws SerializationError for malformed JSON', () => {
      expect(() => deserializeApplication('not valid json')).toThrow(SerializationError);
    });

    it('throws SerializationError for missing id', () => {
      const json = JSON.stringify({ referenceNumber: 'REF-001' });
      expect(() => deserializeApplication(json)).toThrow(SerializationError);
    });

    it('throws SerializationError for missing referenceNumber', () => {
      const json = JSON.stringify({ id: '123' });
      expect(() => deserializeApplication(json)).toThrow(SerializationError);
    });

    it('handles missing optional fields gracefully', () => {
      const json = JSON.stringify({
        id: '123',
        referenceNumber: 'REF-001',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      const result = deserializeApplication(json);
      expect(result.applicantName).toBe('');
      expect(result.categoryId).toBeNull();
      expect(result.decision).toBeNull();
    });

    it('converts string dates to Date objects', () => {
      const now = new Date();
      const json = JSON.stringify({
        id: '123',
        referenceNumber: 'REF-001',
        submittedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      const result = deserializeApplication(json);
      expect(result.submittedAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('deserializeCategory', () => {
    it('throws SerializationError for malformed JSON', () => {
      expect(() => deserializeCategory('{')).toThrow(SerializationError);
    });

    it('throws SerializationError for missing id', () => {
      const json = JSON.stringify({ name: 'Medical' });
      expect(() => deserializeCategory(json)).toThrow(SerializationError);
    });

    it('handles missing optional fields with defaults', () => {
      const json = JSON.stringify({ id: 'cat-1' });
      const result = deserializeCategory(json);
      expect(result.name).toBe('');
      expect(result.allocatedBudget).toBe(0);
      expect(result.spentBudget).toBe(0);
      expect(result.isActive).toBe(false);
    });

    it('converts string numbers to numbers', () => {
      const json = JSON.stringify({
        id: 'cat-1',
        name: 'Medical',
        allocatedBudget: '50000',
        spentBudget: '10000',
      });
      const result = deserializeCategory(json);
      expect(result.allocatedBudget).toBe(50000);
      expect(result.spentBudget).toBe(10000);
    });
  });

  describe('round-trip with edge values', () => {
    it('handles application with all null optional fields', () => {
      const app: Application = {
        id: 'test-id',
        referenceNumber: 'REF-001',
        applicantName: 'Test User',
        applicantEmail: 'test@example.com',
        projectTitle: 'Test Project',
        projectDescription: 'Description',
        requestedAmount: 5000,
        status: 'draft',
        submittedAt: new Date(),
        updatedAt: new Date(),
        categoryId: null,
        categorizationExplanation: null,
        categorizationConfidence: null,
        rankingScore: null,
        rankingBreakdown: null,
        decision: null,
        decisionReason: null,
        decidedAt: null,
        attachments: [],
        feedbackComments: null,
        feedbackRequestedAt: null,
      };

      const serialized = serializeApplication(app);
      const deserialized = deserializeApplication(serialized);

      expect(deserialized.categoryId).toBeNull();
      expect(deserialized.decision).toBeNull();
      expect(deserialized.decidedAt).toBeNull();
    });

    it('handles category with zero budgets', () => {
      const category: Category = {
        id: 'cat-1',
        name: 'Empty Category',
        description: '',
        allocatedBudget: 0,
        spentBudget: 0,
        isActive: true,
      };

      const serialized = serializeCategory(category);
      const deserialized = deserializeCategory(serialized);

      expect(deserialized.allocatedBudget).toBe(0);
      expect(deserialized.spentBudget).toBe(0);
    });
  });
});
