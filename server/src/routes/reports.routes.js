import express from 'express';
import { generateReport, getDashboardStats } from '../controllers/reports.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/generate', authenticate, generateReport);
router.get('/dashboard-stats', authenticate, getDashboardStats);

export default router;
