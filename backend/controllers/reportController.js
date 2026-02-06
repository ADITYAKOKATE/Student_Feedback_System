import Feedback from '../models/Feedback.js';
import Faculty from '../models/Faculty.js';
import Student from '../models/Student.js';

// @desc    Get overall statistics
// @route   GET /api/reports/stats
// @access  Private (Admin)
// @desc    Get overall statistics
// @route   GET /api/reports/stats
// @access  Private (Admin)
export const getOverallStats = async (req, res) => {
    try {
        const query = {};
        // Enforce department access
        if (req.user.department !== 'All') {
            query.department = req.user.department;
        }

        const totalFeedback = await Feedback.countDocuments(query);
        const totalStudents = await Student.countDocuments(query);
        const totalFaculty = await Faculty.countDocuments(query);

        // Improved Aggregation for Map ratings:
        const pipeline = [
            { $match: query },
            {
                $project: {
                    feedbackType: 1,
                    ratingValues: { $objectToArray: "$ratings" }
                }
            },
            {
                $unwind: "$ratingValues"
            },
            {
                $group: {
                    _id: "$feedbackType",
                    avgRating: { $avg: "$ratingValues.v" },
                    count: { $sum: 1 }
                }
            }
        ];

        const stats = await Feedback.aggregate(pipeline);

        const theoryStats = stats.find(s => s._id === 'theory') || { avgRating: 0, count: 0 };
        const practicalStats = stats.find(s => s._id === 'practical') || { avgRating: 0, count: 0 };

        res.json({
            success: true,
            data: {
                totalFeedback,
                totalStudents,
                totalFaculty,
                theoryAvg: parseFloat(theoryStats.avgRating.toFixed(2)),
                practicalAvg: parseFloat(practicalStats.avgRating.toFixed(2))
            }
        });
    } catch (error) {
        console.error('Error getting overall stats:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get feedback count by department
// @route   GET /api/reports/department-distribution
// @access  Private (Admin)
// @desc    Get feedback count by department
// @route   GET /api/reports/department-distribution
// @access  Private (Admin)
export const getDepartmentDistribution = async (req, res) => {
    try {
        const query = {};
        // Enforce department access
        if (req.user.department !== 'All') {
            query.department = req.user.department;
        }

        const distribution = await Feedback.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "$department",
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: distribution.map(d => ({ department: d._id, count: d.count }))
        });
    } catch (error) {
        console.error('Error getting dept distribution:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get top performing faculty
// @route   GET /api/reports/top-faculty
// @access  Private (Admin)
// @desc    Get top performing faculty
// @route   GET /api/reports/top-faculty
// @access  Private (Admin)
export const getTopFaculty = async (req, res) => {
    try {
        const query = { faculty: { $exists: true } };
        // Enforce department access
        if (req.user.department !== 'All') {
            // Note: Feedback schema has 'department' which reflects student's department usually? 
            // Or faculty's department? Ideally we should filter by faculty's department for Top Faculty list.
            // But if Feedback stores the department where feedback was given, we can use that.
            // Let's assume Feedback.department is consistent with Faculty.department for that feedback context.
            query.department = req.user.department;
        }

        const topFaculty = await Feedback.aggregate([
            { $match: query },
            {
                $project: {
                    faculty: 1,
                    ratingValues: { $objectToArray: "$ratings" }
                }
            },
            { $unwind: "$ratingValues" },
            {
                $group: {
                    _id: "$faculty",
                    avgRating: { $avg: "$ratingValues.v" },
                    feedbackCount: { $sum: 1 } // Note: this count is per-rating-field, need to be careful.
                }
            },
            // Re-grouping correctly: 
            // We want average per feedback *instance* then average of those? 
            // Or average of ALL rating values given to that faculty? Usually the latter.
            {
                $lookup: {
                    from: "faculties",
                    localField: "_id",
                    foreignField: "_id",
                    as: "facultyInfo"
                }
            },
            { $unwind: "$facultyInfo" },
            {
                $project: {
                    name: "$facultyInfo.facultyName",
                    subject: "$facultyInfo.subjectName",
                    avgRating: { $round: ["$avgRating", 2] },
                    // feedbackCount is inflated by number of questions. 
                    // Let's just return avgRating for now.
                }
            },
            { $sort: { avgRating: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            success: true,
            data: topFaculty
        });
    } catch (error) {
        console.error('Error getting top faculty:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
