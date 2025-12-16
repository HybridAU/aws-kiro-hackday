import { Router } from 'express';
import { loadCriteria, saveCriteria } from '../services/data';
import { normalizeWeights } from '@dove-grants/shared';
import type { RankingCriterion } from '@dove-grants/shared';

const router = Router();

// Get all criteria
router.get('/', async (_req, res) => {
  try {
    const criteria = await loadCriteria();
    res.json({ success: true, data: criteria });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// Get criteria for a specific category (includes global)
router.get('/category/:categoryId', async (req, res) => {
  try {
    const criteria = await loadCriteria();
    const filtered = criteria.filter(
      (c) => c.categoryId === null || c.categoryId === req.params.categoryId
    );
    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// Create criterion
router.post('/', async (req, res) => {
  try {
    const { name, description, weight, categoryId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Criterion name is required' },
      });
    }

    const criteria = await loadCriteria();
    const newCriterion: RankingCriterion = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      description: description || '',
      weight: weight || 10,
      categoryId: categoryId || null,
    };

    criteria.push(newCriterion);

    // Normalize weights
    const normalized = normalizeWeights(criteria);
    await saveCriteria(normalized);

    res.status(201).json({ success: true, data: newCriterion });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// Update criterion
router.patch('/:id', async (req, res) => {
  try {
    const criteria = await loadCriteria();
    const index = criteria.findIndex((c) => c.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Criterion not found' },
      });
    }

    const { name, description, weight, categoryId } = req.body;
    if (name !== undefined) criteria[index].name = name;
    if (description !== undefined) criteria[index].description = description;
    if (weight !== undefined) criteria[index].weight = weight;
    if (categoryId !== undefined) criteria[index].categoryId = categoryId;

    // Normalize weights
    const normalized = normalizeWeights(criteria);
    await saveCriteria(normalized);

    res.json({ success: true, data: normalized.find((c) => c.id === req.params.id) });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

// Delete criterion
router.delete('/:id', async (req, res) => {
  try {
    const criteria = await loadCriteria();
    const filtered = criteria.filter((c) => c.id !== req.params.id);

    if (filtered.length === criteria.length) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Criterion not found' },
      });
    }

    // Normalize remaining weights
    const normalized = normalizeWeights(filtered);
    await saveCriteria(normalized);

    res.json({ success: true, data: { deleted: req.params.id } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: (error as Error).message },
    });
  }
});

export default router;
