import type { BudgetConfig, StoredBudgetConfig, MultiBudgetConfig } from './types';

/**
 * Migrates a single BudgetConfig to include timestamp fields
 */
export function migrateBudgetConfig(config: Partial<BudgetConfig>): BudgetConfig {
  const now = new Date();
  
  return {
    fiscalYear: config.fiscalYear || new Date().getFullYear(),
    totalBudget: config.totalBudget || 0,
    categories: config.categories || [],
    createdAt: config.createdAt || now,
    updatedAt: config.updatedAt || now,
  };
}

/**
 * Migrates legacy budget.json to multi-year format
 */
export function migrateLegacyBudget(legacyConfig: Partial<BudgetConfig>): MultiBudgetConfig {
  const migratedConfig = migrateBudgetConfig(legacyConfig);
  
  return {
    [migratedConfig.fiscalYear]: migratedConfig,
  };
}

/**
 * Creates a default budget config for a given year
 */
export function createDefaultBudgetConfig(fiscalYear: number): StoredBudgetConfig {
  const now = new Date();
  
  return {
    fiscalYear,
    totalBudget: 100000,
    categories: [
      { id: 'medical', name: 'Medical', description: 'Healthcare projects', allocatedBudget: 30000, isActive: true },
      { id: 'sport', name: 'Sport', description: 'Athletic programs', allocatedBudget: 20000, isActive: true },
      { id: 'education', name: 'Education', description: 'Educational initiatives', allocatedBudget: 25000, isActive: true },
      { id: 'arts', name: 'Arts', description: 'Cultural and artistic projects', allocatedBudget: 15000, isActive: true },
      { id: 'community', name: 'Community', description: 'Community development', allocatedBudget: 10000, isActive: true },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Validates that a fiscal year is reasonable
 */
export function isValidFiscalYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  return year >= 2000 && year <= currentYear + 10;
}