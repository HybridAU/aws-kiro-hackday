import { readFile, writeFile, mkdir, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { BudgetConfig, StoredBudgetConfig } from '@dove-grants/shared';
import { migrateBudgetConfig, createDefaultBudgetConfig, isValidFiscalYear } from '@dove-grants/shared';

const DATA_DIR = join(process.cwd(), 'data');
const BUDGETS_DIR = join(DATA_DIR, 'budgets');
const LEGACY_BUDGET_FILE = join(DATA_DIR, 'budget.json');

async function ensureBudgetsDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
  if (!existsSync(BUDGETS_DIR)) {
    await mkdir(BUDGETS_DIR, { recursive: true });
  }
}

/**
 * Get the file path for a specific fiscal year's budget
 */
function getBudgetFilePath(fiscalYear: number): string {
  return join(BUDGETS_DIR, `${fiscalYear}.json`);
}

/**
 * Load budget configuration for a specific fiscal year
 */
export async function loadBudgetConfigForYear(fiscalYear: number): Promise<StoredBudgetConfig | null> {
  if (!isValidFiscalYear(fiscalYear)) {
    throw new Error(`Invalid fiscal year: ${fiscalYear}`);
  }

  await ensureBudgetsDir();
  
  const budgetFile = getBudgetFilePath(fiscalYear);
  
  try {
    const data = await readFile(budgetFile, 'utf-8');
    const config = JSON.parse(data);
    return migrateBudgetConfig(config);
  } catch (error) {
    // Check if this is the current year and we have a legacy budget.json
    const currentYear = new Date().getFullYear();
    if (fiscalYear === currentYear && existsSync(LEGACY_BUDGET_FILE)) {
      return await migrateLegacyBudgetFile();
    }
    
    // File doesn't exist
    return null;
  }
}

/**
 * Save budget configuration for a specific fiscal year
 */
export async function saveBudgetConfigForYear(fiscalYear: number, config: StoredBudgetConfig): Promise<void> {
  if (!isValidFiscalYear(fiscalYear)) {
    throw new Error(`Invalid fiscal year: ${fiscalYear}`);
  }

  await ensureBudgetsDir();
  
  const budgetFile = getBudgetFilePath(fiscalYear);
  const configWithTimestamp = {
    ...config,
    fiscalYear,
    updatedAt: new Date(),
  };
  
  await writeFile(budgetFile, JSON.stringify(configWithTimestamp, null, 2));
}

/**
 * Get all available fiscal years with budget data
 */
export async function getAvailableFiscalYears(): Promise<number[]> {
  await ensureBudgetsDir();
  
  const years: number[] = [];
  
  try {
    const files = await readdir(BUDGETS_DIR);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const year = parseInt(file.replace('.json', ''), 10);
        if (isValidFiscalYear(year)) {
          years.push(year);
        }
      }
    }
  } catch (error) {
    // Directory doesn't exist or is empty
  }
  
  // Check for legacy budget.json
  if (existsSync(LEGACY_BUDGET_FILE)) {
    const currentYear = new Date().getFullYear();
    if (!years.includes(currentYear)) {
      years.push(currentYear);
    }
  }
  
  return years.sort((a, b) => b - a); // Most recent first
}

/**
 * Create a new budget configuration for a fiscal year
 */
export async function createBudgetConfigForYear(fiscalYear: number): Promise<StoredBudgetConfig> {
  if (!isValidFiscalYear(fiscalYear)) {
    throw new Error(`Invalid fiscal year: ${fiscalYear}`);
  }

  const config = createDefaultBudgetConfig(fiscalYear);
  await saveBudgetConfigForYear(fiscalYear, config);
  return config;
}

/**
 * Delete budget configuration for a specific fiscal year
 */
export async function deleteBudgetConfigForYear(fiscalYear: number): Promise<boolean> {
  if (!isValidFiscalYear(fiscalYear)) {
    throw new Error(`Invalid fiscal year: ${fiscalYear}`);
  }

  const budgetFile = getBudgetFilePath(fiscalYear);
  
  try {
    const { unlink } = await import('fs/promises');
    await unlink(budgetFile);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Migrate legacy budget.json to year-specific format
 */
async function migrateLegacyBudgetFile(): Promise<BudgetConfig> {
  try {
    const data = await readFile(LEGACY_BUDGET_FILE, 'utf-8');
    const legacyConfig = JSON.parse(data);
    const migratedConfig = migrateBudgetConfig(legacyConfig);
    
    // Save to year-specific file
    await saveBudgetConfigForYear(migratedConfig.fiscalYear, migratedConfig);
    
    return migratedConfig;
  } catch (error) {
    throw new Error(`Failed to migrate legacy budget file: ${(error as Error).message}`);
  }
}

/**
 * Check if a budget configuration exists for a specific year
 */
export async function budgetConfigExistsForYear(fiscalYear: number): Promise<boolean> {
  if (!isValidFiscalYear(fiscalYear)) {
    return false;
  }

  const budgetFile = getBudgetFilePath(fiscalYear);
  
  try {
    await stat(budgetFile);
    return true;
  } catch (error) {
    // Check for legacy budget.json if this is the current year
    const currentYear = new Date().getFullYear();
    if (fiscalYear === currentYear && existsSync(LEGACY_BUDGET_FILE)) {
      return true;
    }
    return false;
  }
}

/**
 * Load all budget configurations (for admin purposes)
 * Note: This returns StoredBudgetConfig - use loadBudgetConfig() for enriched data
 */
export async function loadAllBudgetConfigs(): Promise<{ [fiscalYear: number]: StoredBudgetConfig }> {
  const years = await getAvailableFiscalYears();
  const configs: { [fiscalYear: number]: StoredBudgetConfig } = {};
  
  for (const year of years) {
    const config = await loadBudgetConfigForYear(year);
    if (config) {
      configs[year] = config;
    }
  }
  
  return configs;
}