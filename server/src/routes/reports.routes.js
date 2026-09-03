import express from 'express';
import { generateReport, getDashboardStats } from '../controllers/reports.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Report generation dumps whole-module data to CSV/PDF — a bulk-export path like
// /export-csv, so keep it out of intern reach (S13).
router.post('/generate', authenticate, authorize(['admin', 'employee']), generateReport);
router.get('/dashboard-stats', authenticate, getDashboardStats);

export default router;
