import express from 'express';
import { generateReport } from '../controllers/reports.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/generate', authenticate, generateReport);

export default router;
