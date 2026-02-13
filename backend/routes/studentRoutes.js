import express from 'express';
import {
    registerStudent,
    bulkRegisterStudents,
    getAllStudents,
    getStudentsBySection,
    updateStudent,
    deleteStudent,
    toggleEligibility,
    resetFeedback,
    resetPassword,
    bulkUpdateEligibility,
} from '../controllers/studentController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected and require admin access
router.use(authenticate, isAdmin);

// Register student
router.post('/register', registerStudent);
router.post('/bulk-register', bulkRegisterStudents);

// Get all students (with optional filters)
router.get('/', getAllStudents);

// Get students by section
router.get('/section/:class/:division', getStudentsBySection);

// Update student
router.put('/:id', updateStudent);

// Delete student
router.delete('/:id', deleteStudent);

// Toggle eligibility
router.patch('/:id/toggle-eligibility', toggleEligibility);

// Reset feedback
router.patch('/:id/reset-feedback', resetFeedback);

// Reset password
router.patch('/:id/reset-password', resetPassword);

// Bulk update eligibility
router.post('/bulk-eligibility', bulkUpdateEligibility);

export default router;
