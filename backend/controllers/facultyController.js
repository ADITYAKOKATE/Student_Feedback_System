import Faculty from '../models/Faculty.js';

// @desc    Register new faculty
// @route   POST /api/faculty/register
// @access  Private (Admin)
// @access  Private (Admin)
export const registerFaculty = async (req, res) => {
    try {
        const {
            facultyName,
            department,
            subjectName,
            class: className,
            division,
            isElective,
            isPracticalFaculty,
            practicalBatches,
        } = req.body;

        // Validate required fields
        if (!facultyName || !department || !subjectName || !className || !division) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields',
            });
        }

        // Enforce Department Access
        if (req.user.department !== 'All' && req.user.department !== department) {
            return res.status(403).json({
                success: false,
                message: `Access denied. You can only register faculty for ${req.user.department} department.`,
            });
        }

        // Create faculty
        const faculty = await Faculty.create({
            facultyName,
            department,
            subjectName,
            class: className,
            division,
            isElective: isElective || false,
            isPracticalFaculty: isPracticalFaculty || false,
            practicalBatches: (isPracticalFaculty && practicalBatches) ? practicalBatches : [],
        });

        return res.status(201).json({
            success: true,
            message: 'Faculty registered successfully',
            data: faculty,
        });
    } catch (error) {
        console.error('Register faculty error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error registering faculty',
            error: error.message,
        });
    }
};

// @desc    Get all faculty with optional filters
// @route   GET /api/faculty
// @access  Private (Admin)
export const getAllFaculty = async (req, res) => {
    try {
        const { department, class: className, division } = req.query;

        // Build filter object
        // Build filter object
        const filter = {};

        // Enforce Department Access
        if (req.user.department !== 'All') {
            filter.department = req.user.department;
        } else if (department) {
            filter.department = department;
        }

        if (className) filter.class = className;
        if (division) filter.division = division;
        if (req.query.isElective) filter.isElective = req.query.isElective === 'true';

        const faculty = await Faculty.find(filter).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: faculty.length,
            data: faculty,
        });
    } catch (error) {
        console.error('Get faculty error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching faculty',
            error: error.message,
        });
    }
};

// @desc    Get faculty by section (class + division)
// @route   GET /api/faculty/section/:class/:division
// @access  Private (Admin)
export const getFacultyBySection = async (req, res) => {
    try {
        const { class: className, division } = req.params;

        const faculty = await Faculty.find({
            class: className,
            division: division,
        }).sort({ facultyName: 1 });

        return res.status(200).json({
            success: true,
            count: faculty.length,
            data: faculty,
        });
    } catch (error) {
        console.error('Get faculty by section error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching faculty by section',
            error: error.message,
        });
    }
};

// @desc    Update faculty
// @route   PUT /api/faculty/:id
// @access  Private (Admin)
export const updateFaculty = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (updateData.isPracticalFaculty === false) {
            updateData.practicalBatches = [];
        }

        const faculty = await Faculty.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: 'Faculty not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Faculty updated successfully',
            data: faculty,
        });
    } catch (error) {
        console.error('Update faculty error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating faculty',
            error: error.message,
        });
    }
};

// @desc    Delete faculty
// @route   DELETE /api/faculty/:id
// @access  Private (Admin)
export const deleteFaculty = async (req, res) => {
    try {
        const { id } = req.params;

        const faculty = await Faculty.findByIdAndDelete(id);

        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: 'Faculty not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Faculty deleted successfully',
        });
    } catch (error) {
        console.error('Delete faculty error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error deleting faculty',
            error: error.message,
        });
    }
};

// @desc    Bulk register faculty
// @route   POST /api/faculty/bulk-register
// @access  Private (Admin)
export const bulkRegisterFaculty = async (req, res) => {
    try {
        const facultyArray = req.body;

        if (!Array.isArray(facultyArray) || facultyArray.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid data format. Expected an array of faculty.' });
        }

        // Enforce department check for Bulk Register
        if (req.user.department !== 'All') {
            const unauthorizedFaculty = facultyArray.filter(f => f.department !== req.user.department);
            if (unauthorizedFaculty.length > 0) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied. You contain faculty from other departments. You can only register for ${req.user.department}.`,
                });
            }
        }

        const result = await Faculty.insertMany(facultyArray);

        res.status(201).json({
            success: true,
            message: `Successfully registered ${result.length} faculty members.`,
            count: result.length
        });
    } catch (error) {
        console.error('Bulk registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error during bulk registration',
            error: error.message
        });
    }
};
