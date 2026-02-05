import Student from '../models/Student.js';

// @desc    Register new student
// @route   POST /api/students/register
// @access  Private (Admin)
export const registerStudent = async (req, res) => {
    try {
        const {
            grNo,
            username,
            password,
            department,
            class: className,
            division,
            practicalBatch,
            eligibility,
            electiveChosen,
        } = req.body;

        // Validate required fields
        if (
            !grNo ||
            !username ||
            !password ||
            !department ||
            !className ||
            !division ||
            !practicalBatch
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields',
            });
        }

        // Check if student already exists
        const existingStudent = await Student.findOne({
            $or: [{ grNo: grNo.toUpperCase() }, { username }],
        });

        if (existingStudent) {
            return res.status(400).json({
                success: false,
                message: 'Student with this GR Number or Username already exists',
            });
        }

        // Create student
        const student = await Student.create({
            grNo: grNo.toUpperCase(),
            username,
            password,
            department,
            class: className,
            division,
            practicalBatch,
            eligibility: eligibility !== undefined ? eligibility : true,
            electiveChosen: electiveChosen || '',
        });

        // Remove password from response
        const studentResponse = student.toObject();
        delete studentResponse.password;

        return res.status(201).json({
            success: true,
            message: 'Student registered successfully',
            data: studentResponse,
        });
    } catch (error) {
        console.error('Register student error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error registering student',
            error: error.message,
        });
    }
};

// @desc    Bulk register students
// @route   POST /api/students/bulk-register
// @access  Private (Admin)
// @desc    Bulk register students
// @route   POST /api/students/bulk-register
// @access  Private (Admin)
export const bulkRegisterStudents = async (req, res) => {
    try {
        const students = req.body; // Expecting an array of students

        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an array of students',
            });
        }

        const bulkOps = students.map(student => {
            // Normalize GR Number
            const grNo = student.grNo.toUpperCase();

            // Separate eligibility to avoid conflict between $set and $setOnInsert
            const { eligibility, ...otherFields } = student;

            // Base Update operations
            const updateOps = {
                $set: {
                    ...otherFields,
                    grNo: grNo
                },
                $setOnInsert: {
                    feedbackGiven: { theory: false, practical: false }
                }
            };

            // If eligibility is provided, update it ($set).
            // If NOT provided, set default ONLY on insert ($setOnInsert).
            // This prevents "conflict at eligibility" error.
            if (eligibility !== undefined) {
                updateOps.$set.eligibility = eligibility;
            } else {
                updateOps.$setOnInsert.eligibility = true;
            }

            return {
                updateOne: {
                    filter: { grNo: grNo },
                    update: updateOps,
                    upsert: true
                }
            };
        });

        const result = await Student.bulkWrite(bulkOps);

        return res.status(201).json({
            success: true,
            // message: `Processed ${students.length} students.`,
            message: `Bulk processing complete. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}, Upserted: ${result.upsertedCount}`,
            count: students.length,
            result: result
        });

    } catch (error) {
        console.error('Bulk register error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error processing bulk registration',
            error: error.message,
        });
    }
};

// @desc    Get all students with optional filters
// @route   GET /api/students
// @access  Private (Admin)
export const getAllStudents = async (req, res) => {
    try {
        const { department, class: className, division, practicalBatch } = req.query;

        // Build filter object
        const filter = {};
        if (department) filter.department = department;
        if (className) filter.class = className;
        if (division) filter.division = division;
        if (practicalBatch) filter.practicalBatch = practicalBatch;

        const students = await Student.find(filter)
            .select('-password')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: students.length,
            data: students,
        });
    } catch (error) {
        console.error('Get students error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching students',
            error: error.message,
        });
    }
};

// @desc    Get students by section (class + division)
// @route   GET /api/students/section/:class/:division
// @access  Private (Admin)
export const getStudentsBySection = async (req, res) => {
    try {
        const { class: className, division } = req.params;

        const students = await Student.find({
            class: className,
            division: division,
        })
            .select('-password')
            .sort({ grNo: 1 });

        return res.status(200).json({
            success: true,
            count: students.length,
            data: students,
        });
    } catch (error) {
        console.error('Get students by section error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching students by section',
            error: error.message,
        });
    }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private (Admin)
export const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // If password is being updated, it will be hashed by the pre-save hook
        const student = await Student.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        }).select('-password');

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Student updated successfully',
            data: student,
        });
    } catch (error) {
        console.error('Update student error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating student',
            error: error.message,
        });
    }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Admin)
export const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;

        const student = await Student.findByIdAndDelete(id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Student deleted successfully',
        });
    } catch (error) {
        console.error('Delete student error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error deleting student',
            error: error.message,
        });
    }
};

// @desc    Toggle student eligibility
// @route   PATCH /api/students/:id/toggle-eligibility
// @access  Private (Admin)
export const toggleEligibility = async (req, res) => {
    try {
        const { id } = req.params;

        const student = await Student.findById(id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        // Toggle eligibility (Treat undefined as true)
        const currentStatus = student.eligibility !== false; // true if true or undefined
        student.eligibility = !currentStatus;
        await student.save();

        const studentResponse = student.toObject();
        delete studentResponse.password;

        return res.status(200).json({
            success: true,
            message: `Student eligibility ${student.eligibility ? 'enabled' : 'disabled'}`,
            data: studentResponse,
        });
    } catch (error) {
        console.error('Toggle eligibility error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error toggling eligibility',
            error: error.message,
        });
    }
};

// @desc    Reset student feedback status
// @route   PATCH /api/students/:id/reset-feedback
// @access  Private (Admin)
export const resetFeedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { feedbackType } = req.body; // 'theory', 'practical', or 'both'

        const student = await Student.findById(id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        // Reset feedback based on type
        if (feedbackType === 'theory' || feedbackType === 'both') {
            student.feedbackGiven.theory = false;
        }
        if (feedbackType === 'practical' || feedbackType === 'both') {
            student.feedbackGiven.practical = false;
        }

        await student.save();

        const studentResponse = student.toObject();
        delete studentResponse.password;

        return res.status(200).json({
            success: true,
            message: 'Feedback status reset successfully',
            data: studentResponse,
        });
    } catch (error) {
        console.error('Reset feedback error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error resetting feedback',
            error: error.message,
        });
    }
};

// @desc    Reset student password to GR Number
// @route   PATCH /api/students/:id/reset-password
// @access  Private (Admin)
export const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;

        const student = await Student.findById(id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        student.password = student.grNo; // Reset to GR Number
        await student.save();

        return res.status(200).json({
            success: true,
            message: `Password reset to GR Number (${student.grNo})`,
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error resetting password',
            error: error.message,
        });
    }
};
