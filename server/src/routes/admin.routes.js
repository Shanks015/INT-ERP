import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getPendingCounts } from '../controllers/admin.controller.js';

const router = Router();

// Single round trip for the admin nav badges (bell + pending-users + Pending Actions).
// Interns never reach here — 'admin' is an ungated prefix whose only guard is
// authorize(['admin']) below.
router.get('/pending-counts', authenticate, authorize(['admin']), getPendingCounts);

export default router;
