import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import {
  createApplication,
  getApplication,
  updateApplication,
  listApplications,
  loadBudgetConfig,
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
import type { ApplicationFilters, ApplicationStatus, FileAttachment, CriterionScore } from '@dove-grants/shared';

const router = Router();

// Store files in memory, then convert to base64
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for base64 storage
});

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

    let applications = await listApplications(filters);

    // Filter by email if provided (for "My Applications" feature)
    if (req.query.email) {
      const email = (req.query.email as string).toLowerCase();
      applications = applications.filter(
        (app) => app.applicantEmail.toLowerCase() === email
      );
    }

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

        // Note: spentBudget is now calculated dynamically from approved applications
        // No need to manually update it here
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
    } else if (action === 'request_feedback') {
      const { comments } = req.body;
      if (!comments || !comments.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Feedback comments are required' },
        });
      }
      // Add admin feedback to history
      const feedbackHistory = [...(application.feedbackHistory || []), {
        id: uuidv4(),
        author: 'admin' as const,
        content: comments,
        timestamp: new Date(),
      }];
      await updateApplication(req.params.id, {
        status: 'feedback_requested',
        feedbackHistory,
      });
    } else if (action === 'respond_to_feedback') {
      const { response } = req.body;
      if (!response || !response.trim()) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Response is required' },
        });
      }
      // Add applicant response to history
      const feedbackHistory = [...(application.feedbackHistory || []), {
        id: uuidv4(),
        author: 'applicant' as const,
        content: response,
        timestamp: new Date(),
      }];
      await updateApplication(req.params.id, {
        status: 'submitted',
        feedbackHistory,
      });
    } else if (categoryId) {
      // Manual category override
      await updateApplication(req.params.id, { categoryId });
    } else {
      // General field updates (edit)
      const allowedFields = ['applicantName', 'applicantEmail', 'projectTitle', 'projectDescription', 'requestedAmount'];
      const updates: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length > 0) {
        await updateApplication(req.params.id, updates);
      }
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

// Delete application
router.delete('/:id', async (req, res) => {
  try {
    const application = await getApplication(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }

    // Import and use deleteApplication
    const { deleteApplication } = await import('../services/data');
    await deleteApplication(req.params.id);
    
    res.json({ success: true, message: 'Application deleted' });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// Upload file to application (stored as base64 in JSON)
router.post('/:id/files', upload.single('file'), async (req, res) => {
  try {
    const application = await getApplication(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' },
      });
    }

    // Convert to base64
    const base64Data = req.file.buffer.toString('base64');

    const attachment: FileAttachment = {
      id: uuidv4(),
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      data: base64Data,
      uploadedAt: new Date(),
    };

    const attachments = [...(application.attachments || []), attachment];
    await updateApplication(req.params.id, { attachments });

    // Return without the data field to keep response small
    res.json({ success: true, data: { ...attachment, data: undefined } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// Get file (serve base64 as download)
router.get('/:id/files/:fileId', async (req, res) => {
  try {
    const application = await getApplication(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Application not found' },
      });
    }

    const file = application.attachments?.find(f => f.id === req.params.fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'File not found' },
      });
    }

    // Convert base64 back to buffer and send
    const buffer = Buffer.from(file.data, 'base64');
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.send(buffer);
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
    const scoredApps = new Map<string, CriterionScore[]>();

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
