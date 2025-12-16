import { Router } from 'express';
import {
  loadBudgetConfig,
  saveBudgetConfig,
  getCategories,
  updateCategory,
  listApplications,
} from '../services/data';
import {
  validateBudgetAllocation,
  getBudgetStatus,
  getPendingApplications,
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

export default router;
