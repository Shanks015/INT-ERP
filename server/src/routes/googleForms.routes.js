import express from 'express';
import { handleFormSubmit } from '../controllers/googleForms.controller.js';

const router = express.Router();

// Public webhook endpoint for Google Forms
// In production, you might want to add a query param token for basic security
// e.g. /webhook?token=MY_SECRET_KEY
router.post('/webhook', handleFormSubmit);

export default router;
