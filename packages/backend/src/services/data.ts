import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  Application,
  Category,
  BudgetConfig,
  RankingCriterion,
  ApplicationFormData,
  ApplicationFilters,
} from '@dove-grants/shared';
import {
  serializeApplication,
  deserializeApplication,
  filterApplications,
} from '@dove-grants/shared';

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

// Budget Config
const BUDGET_FILE = join(DATA_DIR, 'budget.json');

export async function loadBudgetConfig(): Promise<BudgetConfig> {
  await ensureDataDir();
  try {
    const data = await readFile(BUDGET_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Default budget config
    return {
      fiscalYear: new Date().getFullYear(),
      totalBudget: 100000,
      categories: [
        { id: 'medical', name: 'Medical', description: 'Healthcare projects', allocatedBudget: 30000, spentBudget: 0, isActive: true },
        { id: 'sport', name: 'Sport', description: 'Athletic programs', allocatedBudget: 20000, spentBudget: 0, isActive: true },
        { id: 'education', name: 'Education', description: 'Educational initiatives', allocatedBudget: 25000, spentBudget: 0, isActive: true },
        { id: 'arts', name: 'Arts', description: 'Cultural and artistic projects', allocatedBudget: 15000, spentBudget: 0, isActive: true },
        { id: 'community', name: 'Community', description: 'Community development', allocatedBudget: 10000, spentBudget: 0, isActive: true },
      ],
    };
  }
}

export async function saveBudgetConfig(config: BudgetConfig): Promise<void> {
  await ensureDataDir();
  await writeFile(BUDGET_FILE, JSON.stringify(config, null, 2));
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
