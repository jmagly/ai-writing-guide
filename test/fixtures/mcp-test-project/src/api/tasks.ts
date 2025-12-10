/**
 * Tasks API Routes
 *
 * @implements UC-001, UC-002
 * @security Rate limiting applied
 * @tests .aiwg/testing/test-strategy.md
 */

import { Router, Request, Response } from 'express';
import { TaskService } from '../services/task-service';

const router = Router();
const taskService = new TaskService();

/**
 * POST /api/tasks
 * Create a new task
 * @implements UC-001
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; // From auth middleware
    const task = await taskService.createTask(req.body, userId);
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/tasks/:id/assign
 * Assign or reassign a task
 * @implements UC-002
 */
router.patch('/:id/assign', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { assigneeId } = req.body;
    const task = await taskService.assignTask(req.params.id, assigneeId, userId);
    res.json(task);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/tasks
 * List tasks in workspace
 */
router.get('/', async (req: Request, res: Response) => {
  // TODO: Implement list with filters
  res.json({ tasks: [], total: 0 });
});

/**
 * GET /api/tasks/:id
 * Get task by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  // TODO: Implement get by ID
  res.status(404).json({ error: 'Not found' });
});

export default router;
