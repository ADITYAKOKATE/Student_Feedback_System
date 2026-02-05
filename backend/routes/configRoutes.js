import express from 'express';
import { getFeedbackStatus, toggleFeedbackSession } from '../controllers/configController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/feedback-status', getFeedbackStatus);
router.post('/toggle-feedback', authenticate, isAdmin, toggleFeedbackSession);

export default router;
