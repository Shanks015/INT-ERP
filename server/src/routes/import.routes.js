import express from 'express';
import { importData } from '../controllers/import.controller.js';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/:module', authenticate, upload.single('file'), importData);

export default router;
