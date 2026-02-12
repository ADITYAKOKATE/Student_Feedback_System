import Feedback from '../models/Feedback.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Config from '../models/Config.js';

// @desc    Submit consolidated feedback
// @route   POST /api/feedback/submit
// @access  Private (Student)
export const submitFeedback = async (req, res) => {
    try {
        const {
            theory,
            practical,
            library,
            facilities,
            comments
        } = req.body;

        const studentId = req.user.id; // From middleware

        // Check active feedback round
        let config = await Config.findOne({ key: 'activeFeedbackSession' });
        // Robust check: migration might not have happened if admin didn't toggle yet
        let activeRound = '1';
        if (config && config.value && typeof config.value === 'object' && config.value.activeRound) {
            activeRound = config.value.activeRound;
        }

        // Check if student exists
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Check if feedback already submitted for THIS round
        const existingFeedback = await Feedback.findOne({
            student: studentId,
            feedbackRound: activeRound
        });

        if (existingFeedback) {
            return res.status(400).json({ success: false, message: `Feedback already submitted for Round ${activeRound}.` });
        }

        // Create unified feedback document
        const feedback = await Feedback.create({
            student: studentId,
            department: student.department,
            class: student.class,
            division: student.division,
            theory: theory || [],
            practical: practical || [],
            library: library || {},
            facilities: facilities || {},
            feedbackRound: activeRound
        });

        // We ignore legacy student.feedbackGiven flags as they don't support multi-round.
        // Future cleanup: Remove feedbackGiven from Student model.

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

// @desc    Reset feedback for a student
// @route   DELETE /api/feedback/reset
// @access  Private (Student)
export const resetFeedback = async (req, res) => {
    try {
        const studentId = req.user.id;

        const result = await Feedback.deleteOne({ student: studentId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: 'No feedback found to reset.' });
        }

        // Reset student flags
        await Student.findByIdAndUpdate(studentId, {
            'feedbackGiven.theory': false,
            'feedbackGiven.practical': false
        });

        return res.status(200).json({ success: true, message: 'Feedback reset successfully.' });

    } catch (error) {
        console.error('Reset feedback error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error resetting feedback',
            error: error.message,
        });
    }
};

// @desc    Get feedback reports with filters
// @route   GET /api/feedback/reports
// @access  Private (Admin)
export const getFeedbackReports = async (req, res) => {
    try {
        // This is complex because we need to return a flat list of logic similar to before
        // but data is nested. 
        // Simplest strategy: Fetch all and process in JS (if small scale) 
        // OR use aggregation to unwind.

        const {
            department,
            class: className,
            division,
            feedbackType, // 'theory', 'practical', etc.
            feedbackRound, // '1' or '2'
            fromDate,
            toDate,
        } = req.query;

        const matchStage = {};

        // Filter by Feedback Round if provided, else default to '1' or handle 'All'?
        // Existing data has no feedbackRound, so it defaults to '1' in schema.
        // If user selects "Round 2", we maximize match.
        if (feedbackRound && feedbackRound !== 'All') {
            matchStage.feedbackRound = feedbackRound;
        } else {
            // If not provided, should we show all? Or default to latest?
            // Let's assume 'All' means don't filter.
            // If frontend sends nothing, maybe we should default to '1'?
            // Let's implement active check or just optional filter.
            // For reports, 'All' is better.
        }

        // Enforce Department Access
        if (req.user.department !== 'All') {
            matchStage.department = req.user.department;
        } else if (department) {
            matchStage.department = department;
        }
        if (className) matchStage.class = className;
        if (division) matchStage.division = division;

        if (fromDate || toDate) {
            matchStage.submittedAt = {};
            if (fromDate) matchStage.submittedAt.$gte = new Date(fromDate);
            if (toDate) matchStage.submittedAt.$lte = new Date(toDate);
        }

        let pipeline = [
            { $match: matchStage },
        ];

        // If specific feedback type requested, we can optimize
        if (feedbackType === 'theory') {
            pipeline.push({ $unwind: '$theory' });
            pipeline.push({ $replaceRoot: { newRoot: { $mergeObjects: ['$$ROOT', '$theory'] } } });
        } else if (feedbackType === 'practical') {
            pipeline.push({ $unwind: '$practical' });
            pipeline.push({ $replaceRoot: { newRoot: { $mergeObjects: ['$$ROOT', '$practical'] } } });
        } else if (feedbackType === 'library') {
            pipeline.push({ $replaceRoot: { newRoot: { $mergeObjects: ['$$ROOT', { ratings: '$library.ratings', comments: '$library.comments', feedbackType: 'library' }] } } });
        } else if (feedbackType === 'other_facilities') {
            pipeline.push({ $replaceRoot: { newRoot: { $mergeObjects: ['$$ROOT', { ratings: '$facilities.ratings', comments: '$facilities.comments', feedbackType: 'other_facilities' }] } } });
        } else {
            // If no type specified, this endpoint is tricky. 
            // The original return was a list of mixed types? 
            // Let's assume the frontend usually filters.
            // For now, let's return the raw documents if no type specified, or error?
            // Existing frontend default seems to request with filters.

            // Fallback: just return the raw docs, but populate references
        }

        // Add lookups for faculty and student
        // Note: faculty lookup needs to happen AFTER unwind if we unwound.
        // If we didn't unwind (no feedbackType), populate won't work easily on arrays in aggregation without map.

        // Let's use Mongoose find if no complex aggregation needed, 
        // BUT the frontend expects a flat list of feedback items.
        // We MUST unwind to match previous API contract.

        // Since we can't easily unwind "everything" into a single mixed list without complex $facet, 
        // let's handle the specific cases requested by frontend.

        if (!feedbackType) {
            // Return raw docs with population
            const feedbacks = await Feedback.find(matchStage)
                .populate('student', 'grNo username department class division')
                .populate('theory.faculty')
                .populate('practical.faculty')
                .sort({ submittedAt: -1 });

            return res.status(200).json({ success: true, count: feedbacks.length, data: feedbacks });
        }

        // Continue aggregation for specific type
        pipeline.push({
            $lookup: {
                from: 'students',
                localField: 'student',
                foreignField: '_id',
                as: 'student'
            }
        });
        pipeline.push({ $unwind: '$student' }); // Student is 1:1

        if (feedbackType === 'theory' || feedbackType === 'practical') {
            pipeline.push({
                $lookup: {
                    from: 'faculties',
                    localField: 'faculty', // This field is exposed after unwind/replaceRoot
                    foreignField: '_id',
                    as: 'faculty'
                }
            });
            pipeline.push({ $unwind: '$faculty' });
        }

        const feedbacks = await Feedback.aggregate(pipeline);

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

// @desc    Get feedback summary (aggregated by faculty)
// @route   GET /api/feedback/summary
// @access  Private (Admin)
export const getFeedbackSummary = async (req, res) => {
    try {
        // Similar logic: Fetch all matching docs, then aggregate in JS or pipeline
        const {
            department,
            class: className,
            division,
            feedbackType,
            feedbackRound,
            fromDate,
            toDate,
            groupBy // 'division' (default) or 'class'
        } = req.query;

        const matchStage = {};

        if (feedbackRound && feedbackRound !== 'All') {
            matchStage.feedbackRound = feedbackRound;
        }

        // Enforce Department Access
        if (req.user.department !== 'All') {
            matchStage.department = req.user.department;
        } else if (department) {
            matchStage.department = department;
        }
        if (className) matchStage.class = className;
        if (division && division !== 'All') matchStage.division = division;

        if (fromDate || toDate) {
            matchStage.submittedAt = {};
            if (fromDate) matchStage.submittedAt.$gte = new Date(fromDate);
            if (toDate) matchStage.submittedAt.$lte = new Date(toDate);
        }

        const feedbacks = await Feedback.find(matchStage)
            .populate('theory.faculty', 'facultyName subjectName')
            .populate('practical.faculty', 'facultyName subjectName')
            .populate('student', 'practicalBatch') // Populate student practicalBatch
            .lean();

        const summaryMap = new Map();

        // Helper to process a feedback item
        const processItem = (key, name, subject, division, className, ratings, batch = '-', type = 'general') => {
            if (!summaryMap.has(key)) {
                summaryMap.set(key, {
                    facultyId: key.split('_')[0], // Original ID
                    facultyName: name,
                    subjectName: subject,
                    division: groupBy === 'class' ? 'All' : (groupBy === 'faculty' ? 'All' : division),
                    class: groupBy === 'faculty' ? 'All' : className,
                    batch: batch,
                    totalFeedbacks: 0,
                    totalScoreSum: 0,
                    questionScores: {},
                    // Specific fields for Analysis Report
                    theoryUnits: {}, // Track individual class/batch averages
                    practicalUnits: {},
                    theoryTotal: 0,
                    theoryCount: 0,
                    practicalTotal: 0,
                    practicalCount: 0
                });
            }

            const stats = summaryMap.get(key);
            stats.totalFeedbacks += 1;

            const values = ratings ? Object.values(ratings) : [];
            if (values.length > 0) {
                const sum = values.reduce((a, b) => a + b, 0);
                const avg = sum / values.length;
                stats.totalScoreSum += avg; // Keep this for general stats if needed

                // Unit Level Aggregation for Analysis Report
                if (groupBy === 'faculty') {
                    // Key to identify unique teaching unit: Class + Division + Subject (+ Batch)
                    const unitKey = `${className}_${division}_${subject}_${batch}`;

                    if (type === 'theory') {
                        if (!stats.theoryUnits[unitKey]) stats.theoryUnits[unitKey] = { sum: 0, count: 0 };
                        stats.theoryUnits[unitKey].sum += avg;
                        stats.theoryUnits[unitKey].count += 1;
                    } else if (type === 'practical') {
                        if (!stats.practicalUnits[unitKey]) stats.practicalUnits[unitKey] = { sum: 0, count: 0 };
                        stats.practicalUnits[unitKey].sum += avg;
                        stats.practicalUnits[unitKey].count += 1;
                    }
                } else {
                    // Fallback/Original Logic for other reports
                    if (type === 'theory') {
                        stats.theoryTotal += avg;
                        stats.theoryCount += 1;
                    } else if (type === 'practical') {
                        stats.practicalTotal += avg;
                        stats.practicalCount += 1;
                    }
                }

                for (const [qKey, value] of Object.entries(ratings)) {
                    if (!stats.questionScores[qKey]) {
                        stats.questionScores[qKey] = { sum: 0, count: 0 };
                    }
                    stats.questionScores[qKey].sum += value;
                    stats.questionScores[qKey].count += 1;
                }
            }
        };

        feedbacks.forEach(fb => {
            // Theory
            if (!feedbackType || feedbackType === 'theory') {
                fb.theory.forEach(item => {
                    if (item.faculty) {
                        const key = groupBy === 'class'
                            ? `${item.faculty._id.toString()}_${fb.class}_${item.faculty.subjectName}` // Group by faculty + class + subject
                            : (groupBy === 'faculty'
                                ? `${item.faculty.facultyName}` // Group by Name to merge duplicate IDs
                                : `${item.faculty._id.toString()}_${fb.division}`);

                        processItem(
                            key,
                            item.faculty.facultyName,
                            item.faculty.subjectName,
                            fb.division,
                            fb.class,
                            item.ratings,
                            '-',
                            'theory'
                        );
                    }
                });
            }

            // Practical
            if (!feedbackType || feedbackType === 'practical') {
                fb.practical.forEach(item => {
                    if (item.faculty) {
                        const batch = fb.student?.practicalBatch || '-';
                        const key = groupBy === 'class'
                            ? `${item.faculty._id.toString()}_${fb.class}_${item.faculty.subjectName}_${batch}` // Group by faculty + class + subject + batch (Separate batches, aggregate divisions)
                            : (groupBy === 'faculty'
                                ? `${item.faculty.facultyName}` // Group by Name
                                : `${item.faculty._id.toString()}_${fb.division}_${batch}`);

                        processItem(
                            key,
                            item.faculty.facultyName,
                            item.faculty.subjectName,
                            fb.division,
                            fb.class,
                            item.ratings,
                            batch,
                            'practical'
                        );
                    }
                });
            }

            // Library
            if ((!feedbackType || feedbackType === 'library') && groupBy !== 'faculty') {
                if (fb.library && fb.library.ratings && Object.keys(fb.library.ratings).length > 0) {
                    const key = groupBy === 'class' ? `library_${fb.class}` : `library_${fb.division}`;
                    processItem(key, 'Library', 'General', fb.division, fb.class, fb.library.ratings);
                }
            }

            // Facilities
            if ((!feedbackType || feedbackType === 'other_facilities') && groupBy !== 'faculty') {
                if (fb.facilities && fb.facilities.ratings && Object.keys(fb.facilities.ratings).length > 0) {
                    const key = groupBy === 'class' ? `other_facilities_${fb.class}` : `other_facilities_${fb.division}`;
                    processItem(key, 'Other Facilities', 'General', fb.division, fb.class, fb.facilities.ratings);
                }
            }
        });

        const summaryArray = Array.from(summaryMap.values()).map(item => {
            const questionAverageRatings = {};
            for (const [key, data] of Object.entries(item.questionScores)) {
                questionAverageRatings[key] = (data.sum / data.count).toFixed(2);
            }

            // Calculate Final Averages based on Units (if groupBy faculty)
            let finalTheoryAvg = null;
            let finalPracticalAvg = null;

            if (groupBy === 'faculty') {
                // Theory: Avg of (Unit Avgs)
                const tUnits = Object.values(item.theoryUnits);
                if (tUnits.length > 0) {
                    const totalUnitAvg = tUnits.reduce((acc, unit) => acc + (unit.sum / unit.count), 0);
                    finalTheoryAvg = (totalUnitAvg / tUnits.length).toFixed(2);
                }

                // Practical: Avg of (Unit Avgs)
                const pUnits = Object.values(item.practicalUnits);
                if (pUnits.length > 0) {
                    const totalUnitAvg = pUnits.reduce((acc, unit) => acc + (unit.sum / unit.count), 0);
                    finalPracticalAvg = (totalUnitAvg / pUnits.length).toFixed(2);
                }
            } else {
                // Original Logic
                finalTheoryAvg = item.theoryCount > 0 ? (item.theoryTotal / item.theoryCount).toFixed(2) : null;
                finalPracticalAvg = item.practicalCount > 0 ? (item.practicalTotal / item.practicalCount).toFixed(2) : null;
            }

            return {
                ...item,
                averageRating: item.totalFeedbacks > 0
                    ? (item.totalScoreSum / item.totalFeedbacks).toFixed(2)
                    : 0,
                theoryAverage: finalTheoryAvg,
                practicalAverage: finalPracticalAvg,
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

// @desc    Get feedback by faculty
// @route   GET /api/feedback/faculty/:facultyId
// @access  Private (Admin)
export const getFeedbackByFaculty = async (req, res) => {
    try {
        const { facultyId } = req.params;
        const { feedbackRound } = req.query;

        const query = {
            $or: [
                { 'theory.faculty': facultyId },
                { 'practical.faculty': facultyId }
            ]
        };

        if (feedbackRound && feedbackRound !== 'All') {
            query.feedbackRound = feedbackRound;
        }

        // Find docs that contain this faculty
        const feedbacks = await Feedback.find(query)
            .populate('student', 'grNo username')
            .sort({ submittedAt: -1 });

        // Extract relevant ratings
        const relevantFeedbacks = [];
        const ratingsMap = new Map();

        feedbacks.forEach(fb => {
            // Check theory
            const theoryMatch = fb.theory.find(t => t.faculty && t.faculty.toString() === facultyId);
            if (theoryMatch) {
                relevantFeedbacks.push({
                    student: fb.student,
                    ratings: theoryMatch.ratings,
                    comments: theoryMatch.comments,
                    submittedAt: fb.submittedAt
                });
                // Accumulate ratings
                if (theoryMatch.ratings) {
                    theoryMatch.ratings.forEach((value, key) => {
                        if (!ratingsMap.has(key)) ratingsMap.set(key, []);
                        ratingsMap.get(key).push(value);
                    });
                }
            }

            // Check practical
            const pracMatch = fb.practical.find(p => p.faculty && p.faculty.toString() === facultyId);
            if (pracMatch) {
                relevantFeedbacks.push({
                    student: fb.student,
                    ratings: pracMatch.ratings,
                    comments: pracMatch.comments,
                    submittedAt: fb.submittedAt
                });
                if (pracMatch.ratings) {
                    pracMatch.ratings.forEach((value, key) => {
                        if (!ratingsMap.has(key)) ratingsMap.set(key, []);
                        ratingsMap.get(key).push(value);
                    });
                }
            }
        });

        const averageRatings = {};
        ratingsMap.forEach((values, key) => {
            const sum = values.reduce((acc, val) => acc + val, 0);
            averageRatings[key] = (sum / values.length).toFixed(2);
        });

        return res.status(200).json({
            success: true,
            count: relevantFeedbacks.length,
            data: relevantFeedbacks,
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
            feedbackRound,
            fromDate,
            toDate,
        } = req.query;

        const matchStage = {};

        if (feedbackRound && feedbackRound !== 'All') {
            matchStage.feedbackRound = feedbackRound;
        }

        // Enforce Department Access
        if (req.user.department !== 'All') {
            matchStage.department = req.user.department;
        } else if (department) {
            matchStage.department = department;
        }
        if (className) matchStage.class = className;
        if (division && division !== 'All') matchStage.division = division;

        if (fromDate || toDate) {
            matchStage.submittedAt = {};
            if (fromDate) matchStage.submittedAt.$gte = new Date(fromDate);
            if (toDate) matchStage.submittedAt.$lte = new Date(toDate);
        }

        let pipeline = [
            { $match: matchStage },
        ];

        // Unwind and prepare based on type
        if (feedbackType === 'theory') {
            pipeline.push({ $unwind: '$theory' });
            pipeline.push({ $replaceRoot: { newRoot: { $mergeObjects: ['$$ROOT', '$theory'] } } });
        } else if (feedbackType === 'practical') {
            pipeline.push({ $unwind: '$practical' });
            pipeline.push({ $replaceRoot: { newRoot: { $mergeObjects: ['$$ROOT', '$practical'] } } });
        } else if (feedbackType === 'library') {
            pipeline.push({ $replaceRoot: { newRoot: { $mergeObjects: ['$$ROOT', { ratings: '$library.ratings', comments: '$library.comments', feedbackType: 'library' }] } } });
        } else if (feedbackType === 'other_facilities') {
            pipeline.push({ $replaceRoot: { newRoot: { $mergeObjects: ['$$ROOT', { ratings: '$facilities.ratings', comments: '$facilities.comments', feedbackType: 'other_facilities' }] } } });
        } else {
            // Default to theory if not specified? Or just return error?
            // For export, we probably want specific type.
            pipeline.push({ $unwind: '$theory' });
            pipeline.push({ $replaceRoot: { newRoot: { $mergeObjects: ['$$ROOT', '$theory'] } } });
        }

        // Lookups
        pipeline.push({
            $lookup: {
                from: 'students',
                localField: 'student',
                foreignField: '_id',
                as: 'student'
            }
        });
        pipeline.push({ $unwind: '$student' });

        if (feedbackType === 'theory' || feedbackType === 'practical' || !feedbackType) {
            pipeline.push({
                $lookup: {
                    from: 'faculties',
                    localField: 'faculty',
                    foreignField: '_id',
                    as: 'faculty'
                }
            });
            pipeline.push({ $unwind: '$faculty' });
        }

        const feedbacks = await Feedback.aggregate(pipeline);

        // Format data for export
        const exportData = feedbacks.map((feedback) => ({
            studentGrNo: feedback.student?.grNo || 'N/A',
            studentUsername: feedback.student?.username || 'N/A',
            facultyName: feedback.faculty?.facultyName || (feedbackType === 'library' ? 'N/A' : (feedbackType === 'other_facilities' ? 'N/A' : 'Unknown')),
            subject: feedback.faculty?.subjectName || (feedbackType === 'library' ? 'N/A' : (feedbackType === 'other_facilities' ? 'N/A' : 'Unknown')),
            department: feedback.department,
            class: feedback.class,
            division: feedback.division,
            feedbackType: feedbackType || 'theory',
            ratings: feedback.ratings ? (feedback.ratings instanceof Map ? Object.fromEntries(feedback.ratings) : feedback.ratings) : {},
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

// @desc    Get form data for student (Faculty lists)
// @route   GET /api/feedback/form-data
// @access  Private (Student)
export const getFeedbackFormData = async (req, res) => {
    try {
        const student = req.user;

        if (!student) {
            return res.status(401).json({ success: false, message: 'Student not authenticated' });
        }

        // Get currently active round
        let config = await Config.findOne({ key: 'activeFeedbackSession' });
        let activeRound = '1';
        let isActive = false;

        if (config && config.value) {
            if (typeof config.value === 'object') {
                activeRound = config.value.activeRound || '1';
                isActive = config.value.isActive;
            } else {
                // legacy boolean
                isActive = config.value;
            }
        }

        if (!isActive) {
            // Optional: Return specific message if session is closed? 
            // But existing frontend might just look at isSubmitted. 
            // Let's rely on standard flow but maybe we can signal "Closed".
            // For now, we'll proceed but `isSubmitted` check might be irrelevant 
            // if the whole form is inaccessible. 
            // Actually, usually we block at the UI level or here.
        }

        const theoryFaculty = await Faculty.find({
            department: student.department,
            class: student.class,
            division: student.division,
            isPracticalFaculty: false,
            $or: [
                { isElective: false }, // Core subjects
                { isElective: true, subjectName: student.electiveChosen } // Elective matching student's choice
            ]
        }).select('facultyName subjectName _id');

        const practicalFaculty = await Faculty.find({
            department: student.department,
            class: student.class,
            division: student.division,
            isPracticalFaculty: true,
        }).select('facultyName subjectName _id');

        // Check if feedback exists for THIS round
        const existingFeedback = await Feedback.exists({
            student: student._id,
            feedbackRound: activeRound
        });

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
                },
                isSubmitted: !!existingFeedback,
                activeRound: activeRound
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
