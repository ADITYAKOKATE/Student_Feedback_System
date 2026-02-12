import Feedback from '../models/Feedback.js';
import Faculty from '../models/Faculty.js';
import Student from '../models/Student.js';

// @desc    Get overall statistics
// @route   GET /api/reports/stats
// @access  Private (Admin)
export const getOverallStats = async (req, res) => {
    try {
        const { feedbackRound = '1' } = req.query;
        const query = {};
        if (feedbackRound && feedbackRound !== 'All') {
            query.feedbackRound = feedbackRound;
        }

        // Enforce department access
        if (req.user.department !== 'All') {
            query.department = req.user.department;
        }

        const totalFeedback = await Feedback.countDocuments(query);
        const totalStudents = await Student.countDocuments(req.user.department !== 'All' ? { department: req.user.department } : {});
        const totalFaculty = await Faculty.countDocuments(req.user.department !== 'All' ? { department: req.user.department } : {});

        // Improved Aggregation for Map ratings:
        const stats = await Feedback.aggregate([
            { $match: query },
            {
                $facet: {
                    theoryStats: [
                        { $unwind: "$theory" },
                        { $addFields: { ratingValues: { $objectToArray: "$theory.ratings" } } },
                        { $unwind: "$ratingValues" },
                        {
                            $group: {
                                _id: null,
                                avgRating: { $avg: "$ratingValues.v" }
                            }
                        }
                    ],
                    practicalStats: [
                        { $unwind: "$practical" },
                        { $addFields: { ratingValues: { $objectToArray: "$practical.ratings" } } },
                        { $unwind: "$ratingValues" },
                        {
                            $group: {
                                _id: null,
                                avgRating: { $avg: "$ratingValues.v" }
                            }
                        }
                    ]
                }
            }
        ]);

        const theoryAvg = stats[0]?.theoryStats.length > 0 ? stats[0].theoryStats[0].avgRating : 0;
        const practicalAvg = stats[0]?.practicalStats.length > 0 ? stats[0].practicalStats[0].avgRating : 0;

        res.json({
            success: true,
            data: {
                totalFeedback,
                totalStudents,
                totalFaculty,
                theoryAvg: parseFloat(theoryAvg.toFixed(2)),
                practicalAvg: parseFloat(practicalAvg.toFixed(2))
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
export const getDepartmentDistribution = async (req, res) => {
    try {
        const { feedbackRound = '1' } = req.query;
        const query = {};
        if (feedbackRound && feedbackRound !== 'All') {
            query.feedbackRound = feedbackRound;
        }

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
export const getTopFaculty = async (req, res) => {
    try {
        const { feedbackRound = '1' } = req.query;
        const query = {};
        if (feedbackRound && feedbackRound !== 'All') {
            query.feedbackRound = feedbackRound;
        }

        // Note: We filter initial feedbacks by department if needed
        if (req.user.department !== 'All') {
            query.department = req.user.department;
        }

        const topFaculty = await Feedback.aggregate([
            { $match: query },
            {
                $project: {
                    allItems: {
                        $concatArrays: [
                            { $ifNull: ["$theory", []] },
                            { $ifNull: ["$practical", []] }
                        ]
                    }
                }
            },
            { $unwind: "$allItems" },
            // Lookup faculty info EARLY to grouping by Name
            {
                $lookup: {
                    from: "faculties",
                    localField: "allItems.faculty",
                    foreignField: "_id",
                    as: "facultyInfo"
                }
            },
            { $unwind: "$facultyInfo" },
            {
                $addFields: {
                    ratingValues: { $objectToArray: "$allItems.ratings" }
                }
            },
            { $unwind: "$ratingValues" },
            {
                $group: {
                    _id: "$facultyInfo.facultyName", // Group by Name
                    avgRating: { $avg: "$ratingValues.v" },
                    subjects: { $addToSet: "$facultyInfo.subjectName" } // Collect unique subjects
                }
            },
            {
                $project: {
                    name: "$_id",
                    subject: {
                        $reduce: {
                            input: "$subjects",
                            initialValue: "",
                            in: {
                                $cond: [
                                    { $eq: ["$$value", ""] },
                                    "$$this",
                                    { $concat: ["$$value", ", ", "$$this"] }
                                ]
                            }
                        }
                    },
                    avgRating: { $round: ["$avgRating", 2] }
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
