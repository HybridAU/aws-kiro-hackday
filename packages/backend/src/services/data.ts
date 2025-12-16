import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  Application,
  Category,
  StoredCategory,
  BudgetConfig,
  StoredBudgetConfig,
  RankingCriterion,
  ApplicationFormData,
  ApplicationFilters,
} from '@dove-grants/shared';
import {
  serializeApplication,
  deserializeApplication,
  filterApplications,
} from '@dove-grants/shared';
import { loadBudgetConfigForYear, saveBudgetConfigForYear, createBudgetConfigForYear } from './multi-year-budget';

const DATA_DIR = join(process.cwd(), 'data');

async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

// Applications
const APPLICATIONS_FILE = join(DATA_DIR, 'applications.json');

export async function loadApplications(): Promise<Application[]> {
  await ensureDataDir();
  try {
    const data = await readFile(APPLICATIONS_FILE, 'utf-8');
    const items = JSON.parse(data) as string[];
    return items.map(deserializeApplication);
  } catch {
    return [];
  }
}

export async function saveApplications(applications: Application[]): Promise<void> {
  await ensureDataDir();
  const data = applications.map(serializeApplication);
  await writeFile(APPLICATIONS_FILE, JSON.stringify(data, null, 2));
}

export async function createApplication(formData: ApplicationFormData): Promise<Application> {
  const applications = await loadApplications();
  const now = new Date();

  const application: Application = {
    id: uuidv4(),
    referenceNumber: `DG-${Date.now().toString(36).toUpperCase()}`,
    applicantName: formData.applicantName,
    applicantEmail: formData.applicantEmail,
    projectTitle: formData.projectTitle,
    projectDescription: formData.projectDescription,
    requestedAmount: formData.requestedAmount,
    status: 'submitted',
    submittedAt: now,
    updatedAt: now,
    categoryId: null,
    categorizationExplanation: null,
    categorizationConfidence: null,
    rankingScore: null,
    rankingBreakdown: null,
    decision: null,
    decisionReason: null,
    decidedAt: null,
    attachments: [],
    feedbackHistory: [],
  };

  applications.push(application);
  await saveApplications(applications);
  return application;
}

export async function getApplication(id: string): Promise<Application | null> {
  const applications = await loadApplications();
  return applications.find((a) => a.id === id) || null;
}

export async function updateApplication(
  id: string,
  updates: Partial<Application>
): Promise<Application | null> {
  const applications = await loadApplications();
  const index = applications.findIndex((a) => a.id === id);
  if (index === -1) return null;

  applications[index] = {
    ...applications[index],
    ...updates,
    updatedAt: new Date(),
  };

  await saveApplications(applications);
  return applications[index];
}

export async function listApplications(filters?: ApplicationFilters): Promise<Application[]> {
  const applications = await loadApplications();
  if (!filters) return applications;
  return filterApplications(applications, filters);
}

export async function deleteApplication(id: string): Promise<boolean> {
  const applications = await loadApplications();
  const index = applications.findIndex((a) => a.id === id);
  if (index === -1) return false;
  
  applications.splice(index, 1);
  await saveApplications(applications);
  return true;
}

// Budget Config - Backward compatibility functions
export async function loadBudgetConfig(): Promise<BudgetConfig> {
  const currentYear = new Date().getFullYear();
  
  // Try to load current year's budget
  let storedConfig = await loadBudgetConfigForYear(currentYear);
  
  if (!storedConfig) {
    // Create default config for current year
    storedConfig = await createBudgetConfigForYear(currentYear);
  }
  
  // Enrich categories with calculated spent budgets
  const enrichedCategories = await enrichCategoriesWithSpentBudgets(storedConfig.categories);
  
  return {
    ...storedConfig,
    categories: enrichedCategories
  };
}

export async function saveBudgetConfig(config: BudgetConfig): Promise<void> {
  const fiscalYear = config.fiscalYear || new Date().getFullYear();
  
  // Convert to StoredBudgetConfig (remove spentBudget as it's calculated dynamically)
  const storedConfig: StoredBudgetConfig = {
    ...config,
    categories: config.categories.map(({ spentBudget, ...category }) => category)
  };
  
  await saveBudgetConfigForYear(fiscalYear, storedConfig);
}

export async function getCategories(): Promise<Category[]> {
  const config = await loadBudgetConfig();
  return config.categories;
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
  const config = await loadBudgetConfig();
  const index = config.categories.findIndex((c) => c.id === id);
  if (index === -1) return null;

  config.categories[index] = { ...config.categories[index], ...updates };
  await saveBudgetConfig(config);
  return config.categories[index];
}

/**
 * Calculate spent amounts for each category from approved applications
 */
export async function calculateSpentBudgets(): Promise<Map<string, number>> {
  const applications = await listApplications();
  const spentByCategory = new Map<string, number>();

  // Calculate actual spent amounts from approved applications
  const approvedApplications = applications.filter(app => app.status === 'approved');
  
  approvedApplications.forEach(app => {
    if (app.categoryId) {
      const currentSpent = spentByCategory.get(app.categoryId) || 0;
      spentByCategory.set(app.categoryId, currentSpent + app.requestedAmount);
    }
  });

  return spentByCategory;
}

/**
 * Convert stored categories to full categories with calculated spentBudget
 */
export async function enrichCategoriesWithSpentBudgets(storedCategories: StoredCategory[]): Promise<Category[]> {
  const spentByCategory = await calculateSpentBudgets();
  
  return storedCategories.map(category => ({
    ...category,
    spentBudget: spentByCategory.get(category.id) || 0
  }));
}

// Ranking Criteria
const CRITERIA_FILE = join(DATA_DIR, 'criteria.json');

export async function loadCriteria(): Promise<RankingCriterion[]> {
  await ensureDataDir();
  try {
    const data = await readFile(CRITERIA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Default criteria
    return [
      { id: 'impact', name: 'Community Impact', description: 'Potential positive impact on the community', weight: 30, categoryId: null },
      { id: 'feasibility', name: 'Feasibility', description: 'Likelihood of successful completion', weight: 25, categoryId: null },
      { id: 'budget', name: 'Budget Efficiency', description: 'Value for money and cost-effectiveness', weight: 20, categoryId: null },
      { id: 'innovation', name: 'Innovation', description: 'Novel approach or creative solution', weight: 15, categoryId: null },
      { id: 'sustainability', name: 'Sustainability', description: 'Long-term viability and lasting benefits', weight: 10, categoryId: null },
    ];
  }
}

export async function saveCriteria(criteria: RankingCriterion[]): Promise<void> {
  await ensureDataDir();
  await writeFile(CRITERIA_FILE, JSON.stringify(criteria, null, 2));
}
