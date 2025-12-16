import { Router } from 'express';
import {
  loadBudgetConfig,
  saveBudgetConfig,
  getCategories,
  updateCategory,
  listApplications,
  enrichCategoriesWithSpentBudgets,
} from '../services/data';
import {
  loadBudgetConfigForYear,
  saveBudgetConfigForYear,
  createBudgetConfigForYear,
  deleteBudgetConfigForYear,
  getAvailableFiscalYears,
  budgetConfigExistsForYear,
} from '../services/multi-year-budget';
import {
  validateBudgetAllocation,
  getBudgetStatus,
  getPendingApplications,
  isValidFiscalYear,
} from '@dove-grants/shared';

const router = Router();

// Get budget status
router.get('/status', async (_req, res) => {
  try {
    const config = await loadBudgetConfig();
    const applications = await listApplications();

    // Count pending applications per category
    const pendingCounts = new Map<string, number>();
    const pending = getPendingApplications(applications);
    pending.forEach((app) => {
      if (app.categoryId) {
        pendingCounts.set(app.categoryId, (pendingCounts.get(app.categoryId) || 0) + 1);
      }
    });

    const status = getBudgetStatus(config, pendingCounts);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// Get all categories
router.get('/categories', async (_req, res) => {
  try {
    const categories = await getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// Update category
router.patch('/categories/:id', async (req, res) => {
  try {
    const { name, description, allocatedBudget, isActive } = req.body;
    const updates: Record<string, unknown> = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (allocatedBudget !== undefined) updates.allocatedBudget = allocatedBudget;
    if (isActive !== undefined) updates.isActive = isActive;

    // Validate allocation doesn't exceed budget
    if (allocatedBudget !== undefined) {
      const config = await loadBudgetConfig();
      const otherCategories = config.categories.filter((c) => c.id !== req.params.id);
      const testCategories = [
        ...otherCategories,
        { ...config.categories.find((c) => c.id === req.params.id)!, allocatedBudget },
      ];

      const validation = validateBudgetAllocation(config.totalBudget, testCategories);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'BUDGET_EXCEEDED', message: validation.error },
        });
      }
    }

    const category = await updateCategory(req.params.id, updates);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found' },
      });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// Create category
router.post('/categories', async (req, res) => {
  try {
    const { name, description, allocatedBudget } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Category name is required' },
      });
    }

    const config = await loadBudgetConfig();

    // Validate allocation
    const newCategory = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description: description || '',
      allocatedBudget: allocatedBudget || 0,
      spentBudget: 0,
      isActive: true,
    };

    const validation = validateBudgetAllocation(config.totalBudget, [...config.categories, newCategory]);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'BUDGET_EXCEEDED', message: validation.error },
      });
    }

    config.categories.push(newCategory);
    await saveBudgetConfig(config);

    res.status(201).json({ success: true, data: newCategory });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// Update total budget
router.patch('/total', async (req, res) => {
  try {
    const { totalBudget, fiscalYear } = req.body;
    const config = await loadBudgetConfig();

    if (totalBudget !== undefined) {
      const validation = validateBudgetAllocation(totalBudget, config.categories);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: { code: 'BUDGET_EXCEEDED', message: validation.error },
        });
      }
      config.totalBudget = totalBudget;
    }

    if (fiscalYear !== undefined) {
      config.fiscalYear = fiscalYear;
    }

    await saveBudgetConfig(config);
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// Multi-year budget endpoints

// GET /api/budget/years - List available fiscal years
router.get('/years', async (_req, res) => {
  try {
    const years = await getAvailableFiscalYears();
    res.json({ success: true, data: years });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// GET /api/budget/config/:year - Get budget config for specific year
router.get('/config/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    
    if (!isValidFiscalYear(year)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_YEAR', message: 'Invalid fiscal year' },
      });
    }

    const storedConfig = await loadBudgetConfigForYear(year);
    
    if (!storedConfig) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Budget configuration not found for this year' },
      });
    }

    // Enrich with calculated spent budgets for frontend
    const enrichedCategories = await enrichCategoriesWithSpentBudgets(storedConfig.categories);
    
    const enrichedConfig = {
      ...storedConfig,
      categories: enrichedCategories
    };

    res.json({ success: true, data: enrichedConfig });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// PUT /api/budget/config/:year - Update budget config for year
router.put('/config/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    
    if (!isValidFiscalYear(year)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_YEAR', message: 'Invalid fiscal year' },
      });
    }

    const { totalBudget, categories } = req.body;

    if (typeof totalBudget !== 'number' || totalBudget < 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_BUDGET', message: 'Total budget must be a non-negative number' },
      });
    }

    if (!Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CATEGORIES', message: 'Categories must be an array' },
      });
    }

    // Validate budget allocation
    const validation = validateBudgetAllocation(totalBudget, categories);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'BUDGET_EXCEEDED', message: validation.error },
      });
    }

    const config = {
      fiscalYear: year,
      totalBudget,
      categories,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await saveBudgetConfigForYear(year, config);
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// POST /api/budget/config/:year - Create new budget config for year
router.post('/config/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    
    if (!isValidFiscalYear(year)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_YEAR', message: 'Invalid fiscal year' },
      });
    }

    // Check if config already exists
    const exists = await budgetConfigExistsForYear(year);
    if (exists) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'Budget configuration already exists for this year' },
      });
    }

    const config = await createBudgetConfigForYear(year);
    res.status(201).json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// DELETE /api/budget/config/:year - Delete budget config for year
router.delete('/config/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year, 10);
    
    if (!isValidFiscalYear(year)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_YEAR', message: 'Invalid fiscal year' },
      });
    }

    const deleted = await deleteBudgetConfigForYear(year);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Budget configuration not found for this year' },
      });
    }

    res.json({ success: true, data: { deleted: true, year } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// POST /api/budget/recalculate - Spent budgets are now calculated dynamically
router.post('/recalculate', async (_req, res) => {
  try {
    // Spent budgets are now calculated dynamically from approved applications
    // This endpoint is kept for backward compatibility but no action is needed
    res.json({ success: true, message: 'Spent budgets are calculated dynamically from approved applications' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

export default router;
