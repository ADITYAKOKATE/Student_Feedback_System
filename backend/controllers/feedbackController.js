import Feedback from '../models/Feedback.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';

// @desc    Submit feedback
// @route   POST /api/feedback/submit
// @access  Private (Student)
export const submitFeedback = async (req, res) => {
    try {
        const {
            facultyId,
            feedbackType,
            ratings,
            comments,
        } = req.body;

        // Validate required fields
        if (!feedbackType || !ratings) {
            return res.status(400).json({
                success: false,
                message: 'Please provide feedback type and ratings',
            });
        }

        // Validate facultyId only for theory and practical
        if ((feedbackType === 'theory' || feedbackType === 'practical') && !facultyId) {
            return res.status(400).json({
                success: false,
                message: 'Faculty ID is required for theory and practical feedback',
            });
        }

        // Get student ID from authenticated user
        const studentId = req.user.id;

        // Check if student exists
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found',
            });
        }

        // Check if faculty exists
        // Check if faculty exists (if provided)
        if (facultyId) {
            const faculty = await Faculty.findById(facultyId);
            if (!faculty) {
                return res.status(404).json({
                    success: false,
                    message: 'Faculty not found',
                });
            }
        }

        // Check if feedback already submitted
        const existingFeedback = await Feedback.findOne({
            student: studentId,
            faculty: facultyId,
            feedbackType,
        });

        if (existingFeedback) {
            return res.status(400).json({
                success: false,
                message: 'You have already submitted feedback for this faculty',
            });
        }

        // Create feedback
        const feedback = await Feedback.create({
            student: studentId,
            faculty: facultyId,
            feedbackType,
            department: student.department,
            class: student.class,
            division: student.division,
            ratings,
            comments: comments || '',
        });

        // Update student's feedback status
        if (feedbackType === 'theory') {
            student.feedbackGiven.theory = true;
        } else if (feedbackType === 'practical') {
            student.feedbackGiven.practical = true;
        }
        await student.save();

        return res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: feedback,
        });
    } catch (error) {
        console.error('Submit feedback error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error submitting feedback',
            error: error.message,
        });
    }
};

// @desc    Get feedback reports with filters
// @route   GET /api/feedback/reports
// @access  Private (Admin)
export const getFeedbackReports = async (req, res) => {
    try {
        const {
            department,
            class: className,
            division,
            feedbackType,
            fromDate,
            toDate,
        } = req.query;

        // Build filter object
        const filter = {};
        if (department) filter.department = department;
        if (className) filter.class = className;
        if (division) filter.division = division;
        if (feedbackType) filter.feedbackType = feedbackType;

        // Date range filter
        if (fromDate || toDate) {
            filter.submittedAt = {};
            if (fromDate) filter.submittedAt.$gte = new Date(fromDate);
            if (toDate) filter.submittedAt.$lte = new Date(toDate);
        }

        const feedbacks = await Feedback.find(filter)
            .populate('student', 'grNo username department class division')
            .populate('faculty', 'facultyName subjectName department')
            .sort({ submittedAt: -1 });

        return res.status(200).json({
            success: true,
            count: feedbacks.length,
            data: feedbacks,
        });
    } catch (error) {
        console.error('Get feedback reports error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching feedback reports',
            error: error.message,
        });
    }
};

// @desc    Get feedback by faculty
// @route   GET /api/feedback/faculty/:facultyId
// @access  Private (Admin)
export const getFeedbackByFaculty = async (req, res) => {
    try {
        const { facultyId } = req.params;
        const { feedbackType } = req.query;

        const filter = { faculty: facultyId };
        if (feedbackType) filter.feedbackType = feedbackType;

        const feedbacks = await Feedback.find(filter)
            .populate('student', 'grNo username')
            .sort({ submittedAt: -1 });

        // Calculate average ratings
        const ratingsMap = new Map();
        feedbacks.forEach((feedback) => {
            feedback.ratings.forEach((value, key) => {
                if (!ratingsMap.has(key)) {
                    ratingsMap.set(key, []);
                }
                ratingsMap.get(key).push(value);
            });
        });

        const averageRatings = {};
        ratingsMap.forEach((values, key) => {
            const sum = values.reduce((acc, val) => acc + val, 0);
            averageRatings[key] = (sum / values.length).toFixed(2);
        });

        return res.status(200).json({
            success: true,
            count: feedbacks.length,
            data: feedbacks,
            averageRatings,
        });
    } catch (error) {
        console.error('Get feedback by faculty error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching feedback by faculty',
            error: error.message,
        });
    }
};

// @desc    Export feedback data
// @route   GET /api/feedback/export
// @access  Private (Admin)
export const exportFeedbackData = async (req, res) => {
    try {
        const {
            department,
            class: className,
            division,
            feedbackType,
        } = req.query;

        // Build filter object
        const filter = {};
        if (department) filter.department = department;
        if (className) filter.class = className;
        if (division) filter.division = division;
        if (feedbackType) filter.feedbackType = feedbackType;

        const feedbacks = await Feedback.find(filter)
            .populate('student', 'grNo username department class division practicalBatch')
            .populate('faculty', 'facultyName subjectName department class division')
            .sort({ submittedAt: -1 });

        // Format data for export
        const exportData = feedbacks.map((feedback) => ({
            studentGrNo: feedback.student?.grNo || 'N/A',
            studentUsername: feedback.student?.username || 'N/A',
            facultyName: feedback.faculty?.facultyName || 'N/A',
            subject: feedback.faculty?.subjectName || 'N/A',
            department: feedback.department,
            class: feedback.class,
            division: feedback.division,
            feedbackType: feedback.feedbackType,
            ratings: feedback.ratings ? Object.fromEntries(feedback.ratings) : {},
            comments: feedback.comments,
            submittedAt: feedback.submittedAt,
        }));

        return res.status(200).json({
            success: true,
            count: exportData.length,
            data: exportData,
        });
    } catch (error) {
        console.error('Export feedback data error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error exporting feedback data',
            error: error.message,
        });
    }
};

// @desc    Get feedback summary (aggregated by faculty)
// @route   GET /api/feedback/summary
// @access  Private (Admin)
export const getFeedbackSummary = async (req, res) => {
    try {
        const {
            department,
            class: className,
            division,
            feedbackType,
            fromDate,
            toDate,
        } = req.query;

        // Build filter object
        const filter = {};
        if (department) filter.department = department;
        if (className) filter.class = className;
        if (division && division !== 'All') filter.division = division;
        if (feedbackType) filter.feedbackType = feedbackType;

        // Date range filter
        if (fromDate || toDate) {
            filter.submittedAt = {};
            if (fromDate) filter.submittedAt.$gte = new Date(fromDate);
            if (toDate) filter.submittedAt.$lte = new Date(toDate);
        }

        // Fetch all matching feedback
        const feedbacks = await Feedback.find(filter)
            .populate('faculty', 'facultyName subjectName')
            .lean();

        // Aggregate data
        const summaryMap = new Map();

        feedbacks.forEach(fb => {
            let key, name, subject;

            if (fb.faculty) {
                // Theory / Practical
                key = fb.faculty._id.toString();
                name = fb.faculty.facultyName;
                subject = fb.faculty.subjectName;
            } else {
                // Library / Facilities
                // Group by feedbackType
                key = fb.feedbackType;
                // Capitalize first letter for display
                name = fb.feedbackType === 'other_facilities' ? 'Other Facilities' : 'Library';
                subject = 'General';
            }

            if (!summaryMap.has(key)) {
                summaryMap.set(key, {
                    facultyId: key, // Using type as ID for non-faculty
                    facultyName: name,
                    subjectName: subject,
                    totalFeedbacks: 0,
                    totalScoreSum: 0,
                    questionScores: {},
                });
            }

            const stats = summaryMap.get(key);
            stats.totalFeedbacks += 1;

            const ratings = fb.ratings || {};
            const values = Object.values(ratings);

            if (values.length > 0) {
                const sum = values.reduce((a, b) => a + b, 0);
                const avg = sum / values.length;
                stats.totalScoreSum += avg;

                for (const [qKey, value] of Object.entries(ratings)) {
                    if (!stats.questionScores[qKey]) {
                        stats.questionScores[qKey] = { sum: 0, count: 0 };
                    }
                    stats.questionScores[qKey].sum += value;
                    stats.questionScores[qKey].count += 1;
                }
            }
        });

        const summaryArray = Array.from(summaryMap.values()).map(item => {
            // Calculate average per question
            const questionAverageRatings = {};
            for (const [key, data] of Object.entries(item.questionScores)) {
                questionAverageRatings[key] = (data.sum / data.count).toFixed(2);
            }

            return {
                ...item,
                averageRating: item.totalFeedbacks > 0
                    ? (item.totalScoreSum / item.totalFeedbacks).toFixed(2)
                    : 0,
                questionAverageRatings
            };
        });

        return res.status(200).json({
            success: true,
            count: summaryArray.length,
            data: summaryArray,
        });

    } catch (error) {
        console.error('Get feedback summary error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching feedback summary',
            error: error.message,
        });
    }
};

// @desc    Get form data for student (Faculty lists)
// @route   GET /api/feedback/form-data
// @access  Private (Student)
export const getFeedbackFormData = async (req, res) => {
    try {
        // req.user is populated by protectStudent middleware
        const student = req.user;

        if (!student) {
            return res.status(401).json({ success: false, message: 'Student not authenticated' });
        }

        // Fetch Theory Faculty
        // Matches Student's Department, Class, and Division
        const theoryFaculty = await Faculty.find({
            department: student.department,
            class: student.class,
            division: student.division,
            isPracticalFaculty: false, // Theory only
        }).select('facultyName subjectName _id');

        // Fetch Practical Faculty
        // Matches Student's Department, Class, Division AND Batch (if batch is assigned in Faculty? Wait Faculty model doesn't have batch)
        // Practical Faculty usually assigned to specific batches?
        // Let's check Faculty model again. It has class, division. Does it have batch?
        // Step 542 shows Faculty model has `class` and `division`. No batch field.
        // Assuming Practical Faculty for the Division teaches all batches OR we need to filter if DB had batch.
        // For now, fetch all practical faculty for the division.
        const practicalFaculty = await Faculty.find({
            department: student.department,
            class: student.class,
            division: student.division,
            isPracticalFaculty: true,
        }).select('facultyName subjectName _id');

        return res.status(200).json({
            success: true,
            data: {
                theoryFaculty,
                practicalFaculty,
                studentInfo: {
                    name: student.username,
                    class: student.class,
                    division: student.division,
                    department: student.department
                }
            }
        });

    } catch (error) {
        console.error('Get feedback form data error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching form data',
            error: error.message,
        });
    }
};
