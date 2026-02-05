import express from 'express';
import { authenticate, isAdmin } from '../middleware/auth.js';
import {
    getOverallStats,
    getDepartmentDistribution,
    getTopFaculty
} from '../controllers/reportController.js';

const router = express.Router();

router.use(authenticate);
router.use(isAdmin);

router.get('/stats', getOverallStats);
router.get('/department-distribution', getDepartmentDistribution);
router.get('/top-faculty', getTopFaculty);

export default router;
