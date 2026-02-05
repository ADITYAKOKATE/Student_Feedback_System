import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';

// Generate JWT token
const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '7d',
    });
};

// @desc    Admin login
// @route   POST /api/auth/admin/login
// @access  Public
export const adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide username and password',
            });
        }

        // Check credentials against environment variables (hardcoded admin)
        if (
            username === process.env.ADMIN_USERNAME &&
            password === process.env.ADMIN_PASSWORD
        ) {
            // Generate token
            const token = generateToken({
                username: username,
                role: 'admin',
            });

            return res.status(200).json({
                success: true,
                message: 'Admin login successful',
                token,
                user: {
                    username,
                    role: 'admin',
                },
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message,
        });
    }
};

// @desc    Student login
// @route   POST /api/auth/student/login
// @access  Public
export const studentLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide GR Number/Username and password',
            });
        }

        // Find student by GR Number OR Username
        console.log(`[DEBUG] Login Attempt: ${username}`);

        const student = await Student.findOne({
            $or: [
                { grNo: username.toUpperCase() },
                { username: username }
            ]
        });

        if (!student) {
            console.log(`[DEBUG] Student not found for: ${username}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }
        console.log(`[DEBUG] Student found: ${student.grNo}`);

        // Check if student is eligible
        // Explicitly check for false, so undefined (legacy) defaults to eligible
        if (student.eligibility === false) {
            return res.status(403).json({
                success: false,
                message: 'You are not eligible to submit feedback. Please contact admin.',
            });
        }

        // Compare password
        const isPasswordMatch = await student.comparePassword(password);

        if (!isPasswordMatch) {
            console.log(`[DEBUG] Password mismatch for: ${student.grNo}`);
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        // Generate token
        const token = generateToken({
            id: student._id,
            grNo: student.grNo,
            username: student.username,
            role: 'student',
        });

        return res.status(200).json({
            success: true,
            message: 'Student login successful',
            token,
            user: {
                id: student._id,
                grNo: student.grNo,
                username: student.username,
                department: student.department,
                class: student.class,
                division: student.division,
                role: 'student',
                feedbackGiven: student.feedbackGiven,
            },
        });
    } catch (error) {
        console.error('Student login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message,
        });
    }
};

// @desc    Logout (client-side token removal)
// @route   POST /api/auth/logout
// @access  Public
export const logout = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            message: 'Logout successful',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error during logout',
            error: error.message,
        });
    }
};
