import express from 'express';
import {
    submitFeedback,
    getFeedbackReports,
    getFeedbackSummary,
    getFeedbackByFaculty,
    exportFeedbackData,
    getFeedbackFormData,
} from '../controllers/feedbackController.js';
import { authenticate, isAdmin, protectStudent } from '../middleware/auth.js';

const router = express.Router();

// Submit feedback (Student only)
router.post('/submit', protectStudent, submitFeedback);

// Get feedback summary (Admin only)
router.get('/summary', authenticate, isAdmin, getFeedbackSummary);

// Get feedback reports (Admin only)
router.get('/reports', authenticate, isAdmin, getFeedbackReports);

// Get feedback by faculty (Admin only)
router.get('/faculty/:facultyId', authenticate, isAdmin, getFeedbackByFaculty);

// Export feedback data (Admin only)
router.get('/export', authenticate, isAdmin, exportFeedbackData);

// Get feedback form data (Student)
router.get('/form-data', protectStudent, getFeedbackFormData);

export default router;
