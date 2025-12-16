import { Router } from 'express';
import {
  createApplication,
  getApplication,
  updateApplication,
  listApplications,
  loadBudgetConfig,
  saveBudgetConfig,
  getCategories,
  loadCriteria,
} from '../services/data';
import { categorizeApplication, scoreApplicationByCriteria, isAIConfigured } from '../services/ai';
import {
  validateApplicationForm,
  checkApprovalBudgetWarning,
  rankApplications,
  calculateTotalScore,
} from '@dove-grants/shared';
import type { ApplicationFilters, ApplicationStatus } from '@dove-grants/shared';

const router = Router();

// Create application
router.post('/', async (req, res) => {
  try {
    const validation = validateApplicationForm(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid form data', details: validation.errors },
      });
    }

    const application = await createApplication(req.body);

    // Auto-categorize if AI is configured
    if (isAIConfigured()) {
      const categories = await getCategories();
      if (categories.length > 0) {
        const categorization = await categorizeApplication(application, categories);
        await updateApplication(application.id, {
          categoryId: categorization.categoryId,
          categorizationExplanation: categorization.explanation,
          categorizationConfidence: categorization.confidence,
          status: 'categorized',
        });
      }
    }

    const updated = await getApplication(application.id);
    res.status(201).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// List applications with filters
router.get('/', async (req, res) => {
  try {
    const filters: ApplicationFilters = {};
    if (req.query.categoryId) filters.categoryId = req.query.categoryId as string;
    if (req.query.status) filters.status = req.query.status as ApplicationStatus;
    if (req.query.search) filters.searchTerm = req.query.search as string;

    const applications = await listApplications(filters);
    res.json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// Get single application
router.get('/:id', async (req, res) => {
  try {
    const application = await getApplication(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }
    res.json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// Update application (approve/reject)
router.patch('/:id', async (req, res) => {
  try {
    const application = await getApplication(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }

    const { action, reason, categoryId } = req.body;

    if (action === 'approve') {
      // Check budget warning
      const config = await loadBudgetConfig();
      const category = config.categories.find((c) => c.id === application.categoryId);
      if (category) {
        const warning = checkApprovalBudgetWarning(category, application.requestedAmount);
        if (warning.warning && !req.body.confirmOverBudget) {
          return res.status(400).json({
            success: false,
            error: { code: 'BUDGET_WARNING', message: warning.message, requiresConfirmation: true },
          });
        }

        // Deduct from budget
        category.spentBudget += application.requestedAmount;
        await saveBudgetConfig(config);
      }

      await updateApplication(req.params.id, {
        status: 'approved',
        decision: 'approved',
        decisionReason: reason || null,
        decidedAt: new Date(),
      });
    } else if (action === 'reject') {
      await updateApplication(req.params.id, {
        status: 'rejected',
        decision: 'rejected',
        decisionReason: reason || null,
        decidedAt: new Date(),
      });
    } else if (categoryId) {
      // Manual category override
      await updateApplication(req.params.id, { categoryId });
    }

    const updated = await getApplication(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// Rank applications in a category
router.post('/rank/:categoryId', async (req, res) => {
  try {
    const applications = await listApplications({
      categoryId: req.params.categoryId,
      status: 'categorized',
    });

    if (applications.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const criteria = await loadCriteria();
    const scoredApps = new Map<string, typeof import('@dove-grants/shared').CriterionScore[]>();

    // Score each application
    for (const app of applications) {
      if (isAIConfigured()) {
        const scores = await scoreApplicationByCriteria(app, criteria);
        scoredApps.set(app.id, scores);

        // Update application with scores
        const totalScore = calculateTotalScore(scores);
        await updateApplication(app.id, {
          rankingScore: totalScore,
          rankingBreakdown: scores,
          status: 'under_review',
        });
      }
    }

    const ranked = rankApplications(applications, scoredApps);
    res.json({ success: true, data: ranked });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

export default router;
