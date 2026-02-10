import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Faculty from './models/Faculty.js';
import Student from './models/Student.js';
import Feedback from './models/Feedback.js';

dotenv.config();

const seedFeedback = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Fetch SE Students and Faculty
        const students = await Student.find({ class: 'SE' });
        const faculties = await Faculty.find({ class: 'SE' });

        if (students.length === 0) {
            console.log('No SE students found. Run seed_se_data.js first.');
            process.exit();
        }

        console.log(`Found ${students.length} students and ${faculties.length} faculty.`);

        const feedbackEntries = [];

        // Helper to generate random ratings (1-5)
        const generateRatings = (count) => {
            const ratings = {};
            for (let i = 1; i <= count; i++) {
                ratings[`q${i}`] = Math.floor(Math.random() * 5) + 1; // 1 to 5
            }
            return ratings;
        };

        for (const student of students) {
            const feedbackEntry = {
                student: student._id,
                department: student.department,
                class: student.class,
                division: student.division,
                theory: [],
                practical: [],
                library: {
                    ratings: generateRatings(5),
                    comments: 'Good library'
                },
                facilities: {
                    ratings: generateRatings(5),
                    comments: 'Clean campus'
                }
            };

            // Theory Faculty for this student's division
            const theoryFaculty = faculties.filter(f =>
                f.division === student.division &&
                !f.isPracticalFaculty
            );

            theoryFaculty.forEach(faculty => {
                feedbackEntry.theory.push({
                    faculty: faculty._id,
                    subject: faculty.subjectName,
                    ratings: generateRatings(10), // Assuming 10 questions for theory
                    comments: 'Great teaching'
                });
            });

            // Practical Faculty for this student's division AND batch
            const practicalFaculty = faculties.filter(f =>
                f.division === student.division &&
                f.isPracticalFaculty &&
                f.practicalBatches.includes(student.practicalBatch)
            );

            practicalFaculty.forEach(faculty => {
                feedbackEntry.practical.push({
                    faculty: faculty._id,
                    subject: faculty.subjectName,
                    ratings: generateRatings(10), // Assuming 10 questions for practical
                    comments: 'Helpful in lab'
                });
            });

            feedbackEntries.push(feedbackEntry);
        }

        // Clear existing feedback for these students to avoid duplicates
        const studentIds = students.map(s => s._id);
        await Feedback.deleteMany({ student: { $in: studentIds } });
        console.log('Cleared existing feedback for SE students.');

        await Feedback.insertMany(feedbackEntries);
        console.log(`✅ Successfully seeded feedback for ${feedbackEntries.length} students.`);

        process.exit();
    } catch (error) {
        console.error('❌ Error seeding feedback:', error);
        process.exit(1);
    }
};

seedFeedback();
