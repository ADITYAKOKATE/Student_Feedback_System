import express from 'express';
import {
    registerFaculty,
    getAllFaculty,
    getFacultyBySection,
    updateFaculty,
    deleteFaculty,
    bulkRegisterFaculty
} from '../controllers/facultyController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected and require admin access
router.use(authenticate, isAdmin);

// Register faculty
router.post('/register', registerFaculty);

// @route   POST /api/faculty/bulk-register
// @access  Private (Admin only)
router.post('/bulk-register', bulkRegisterFaculty); // Changed 'protect' to 'authenticate' and removed redundant 'isAdmin' as it's applied by router.use

// Get all faculty (with optional filters)
router.get('/', getAllFaculty);

// Get faculty by section
router.get('/section/:class/:division', getFacultyBySection);

// Update faculty
router.put('/:id', updateFaculty);

// Delete faculty
router.delete('/:id', deleteFaculty);

export default router;
