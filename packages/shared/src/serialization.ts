import type { Application, Category, BudgetConfig, CriterionScore } from './types';

// Serialization error
export class SerializationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'SerializationError';
  }
}

// Application serialization
export function serializeApplication(app: Application): string {
  return JSON.stringify({
    ...app,
    submittedAt: app.submittedAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    decidedAt: app.decidedAt?.toISOString() ?? null,
    feedbackRequestedAt: app.feedbackRequestedAt?.toISOString() ?? null,
  });
}

export function deserializeApplication(json: string): Application {
  try {
    const obj = JSON.parse(json);

    if (!obj.id || typeof obj.id !== 'string') {
      throw new SerializationError('Missing or invalid id', 'id');
    }
    if (!obj.referenceNumber || typeof obj.referenceNumber !== 'string') {
      throw new SerializationError('Missing or invalid referenceNumber', 'referenceNumber');
    }

    return {
      id: obj.id,
      referenceNumber: obj.referenceNumber,
      applicantName: obj.applicantName ?? '',
      applicantEmail: obj.applicantEmail ?? '',
      projectTitle: obj.projectTitle ?? '',
      projectDescription: obj.projectDescription ?? '',
      requestedAmount: Number(obj.requestedAmount) || 0,
      status: obj.status ?? 'draft',
      submittedAt: new Date(obj.submittedAt),
      updatedAt: new Date(obj.updatedAt),
      categoryId: obj.categoryId ?? null,
      categorizationExplanation: obj.categorizationExplanation ?? null,
      categorizationConfidence: obj.categorizationConfidence ?? null,
      rankingScore: obj.rankingScore ?? null,
      rankingBreakdown: obj.rankingBreakdown
        ? (obj.rankingBreakdown as CriterionScore[])
        : null,
      decision: obj.decision ?? null,
      decisionReason: obj.decisionReason ?? null,
      decidedAt: obj.decidedAt ? new Date(obj.decidedAt) : null,
      attachments: obj.attachments ?? [],
      feedbackComments: obj.feedbackComments ?? null,
      feedbackRequestedAt: obj.feedbackRequestedAt ? new Date(obj.feedbackRequestedAt) : null,
    };
  } catch (error) {
    if (error instanceof SerializationError) throw error;
    throw new SerializationError(`Failed to parse application JSON: ${(error as Error).message}`);
  }
}

// Category serialization
export function serializeCategory(category: Category): string {
  return JSON.stringify(category);
}

export function deserializeCategory(json: string): Category {
  try {
    const obj = JSON.parse(json);

    if (!obj.id || typeof obj.id !== 'string') {
      throw new SerializationError('Missing or invalid id', 'id');
    }

    return {
      id: obj.id,
      name: obj.name ?? '',
      description: obj.description ?? '',
      allocatedBudget: Number(obj.allocatedBudget) || 0,
      spentBudget: Number(obj.spentBudget) || 0,
      isActive: Boolean(obj.isActive),
    };
  } catch (error) {
    if (error instanceof SerializationError) throw error;
    throw new SerializationError(`Failed to parse category JSON: ${(error as Error).message}`);
  }
}

// BudgetConfig serialization
export function serializeBudgetConfig(config: BudgetConfig): string {
  return JSON.stringify(config);
}

export function deserializeBudgetConfig(json: string): BudgetConfig {
  try {
    const obj = JSON.parse(json);

    if (typeof obj.fiscalYear !== 'number') {
      throw new SerializationError('Missing or invalid fiscalYear', 'fiscalYear');
    }

    return {
      fiscalYear: obj.fiscalYear,
      totalBudget: Number(obj.totalBudget) || 0,
      categories: Array.isArray(obj.categories)
        ? obj.categories.map((c: unknown) => {
            const cat = c as Record<string, unknown>;
            return {
              id: String(cat.id ?? ''),
              name: String(cat.name ?? ''),
              description: String(cat.description ?? ''),
              allocatedBudget: Number(cat.allocatedBudget) || 0,
              spentBudget: Number(cat.spentBudget) || 0,
              isActive: Boolean(cat.isActive),
            };
          })
        : [],
    };
  } catch (error) {
    if (error instanceof SerializationError) throw error;
    throw new SerializationError(`Failed to parse budget config JSON: ${(error as Error).message}`);
  }
}

// Generic safe parse
export function safeParseJSON<T>(json: string, validator: (v: unknown) => v is T): T | null {
  try {
    const parsed = JSON.parse(json);
    return validator(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
