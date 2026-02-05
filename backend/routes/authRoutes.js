import express from 'express';
import {
    adminLogin,
    studentLogin,
    logout,
} from '../controllers/authController.js';

const router = express.Router();

// Admin login
router.post('/admin/login', adminLogin);

// Student login
router.post('/student/login', studentLogin);

// Logout
router.post('/logout', logout);

export default router;
