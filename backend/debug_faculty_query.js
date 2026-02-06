import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Student.js';
import Faculty from './models/Faculty.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error.message);
        process.exit(1);
    }
};

const debugFaculty = async () => {
    await connectDB();

    try {
        // Find a student
        const student = await Student.findOne();
        if (!student) {
            console.log('No students found.');
            return;
        }

        console.log('--- Sample Student ---');
        console.log(`ID: ${student._id}`);
        console.log(`Username: ${student.username}`);
        console.log(`Class: ${student.class}`);
        console.log(`Division: ${student.division}`);
        console.log(`Department: ${student.department}`);

        // Check for Department Mismatch
        console.log('\n--- Checking for Department Mismatches ---');
        const wideQuery = {
            class: student.class,
            division: student.division
        };
        const wideFaculty = await Faculty.find(wideQuery);
        console.log(`Found ${wideFaculty.length} faculty for Class ${student.class} Div ${student.division} (ignoring Department):`);
        wideFaculty.forEach(f => {
            console.log(`- ${f.facultyName} (${f.subjectName}) | Dept: '${f.department}' | Practical: ${f.isPracticalFaculty}`);
        });

        // Check Student Departments
        const mismatchCount = await Student.countDocuments({ department: 'Computer - AIML' });
        console.log(`\nNumber of students with 'Computer - AIML': ${mismatchCount}`);

        const aimlCount = await Student.countDocuments({ department: 'AIML' });
        console.log(`Number of students with 'AIML': ${aimlCount}`);

        // Find Theory Faculty
        const theoryQuery = {
            department: student.department,
            class: student.class,
            division: student.division,
            isPracticalFaculty: false,
        };
        console.log('\n--- Theory Faculty Query ---');
        console.log(theoryQuery);

        const theoryFaculty = await Faculty.find(theoryQuery);
        console.log(`Found ${theoryFaculty.length} theory faculty members.`);
        theoryFaculty.forEach(f => {
            console.log(`- ${f.facultyName} (${f.subjectName}) [isPractical: ${f.isPracticalFaculty}]`);
        });

        // Find ALL Faculty matching class/div to see if any exist
        const allFacultyQuery = {
            department: student.department,
            class: student.class,
            division: student.division,
        };
        const allFaculty = await Faculty.find(allFacultyQuery);
        console.log(`\n Total Faculty for this Class/Div: ${allFaculty.length}`);

        // Find if there are any faculty at all
        const anyFaculty = await Faculty.findOne();
        if (anyFaculty) {
            console.log('\n--- Sample Faculty from DB (Any) ---');
            console.log(`Class: ${anyFaculty.class}, Div: ${anyFaculty.division}, Dept: ${anyFaculty.department}, Practical: ${anyFaculty.isPracticalFaculty}`);
        } else {
            console.log('\nNo faculty found in DB at all.');
        }

    } catch (error) {
        console.error(error);
    } finally {
        mongoose.connection.close();
    }
};

debugFaculty();
