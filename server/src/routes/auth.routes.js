import express from 'express';
import { register, login, getMe } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { logAuth } from '../middleware/activityLogger.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', logAuth('login'), login);
router.get('/me', authenticate, getMe);

export default router;
