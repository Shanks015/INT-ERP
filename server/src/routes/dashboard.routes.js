import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getDashboardStats } from '../controllers/dashboard.controller.js';

const router = Router();

// Analytics Dashboard — replaces four parallel /stats calls (campus-visits,
// events, partners, outreach) with one. Gated on the 'dashboard' module for
// interns, matching the page's own access rule.
router.get('/stats', authenticate, getDashboardStats);

export default router;
