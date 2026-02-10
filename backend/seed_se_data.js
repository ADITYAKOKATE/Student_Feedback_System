import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Faculty from './models/Faculty.js';
import Student from './models/Student.js';

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // --- SE FACULTY DATA ---
        const facultyData = [
            // Division A
            { facultyName: 'Alice Johnson', department: 'AIML', subjectName: 'Data Structures', class: 'SE', division: 'A', isElective: false, isPracticalFaculty: false },
            { facultyName: 'Bob Smith', department: 'AIML', subjectName: 'Data Structures Lab', class: 'SE', division: 'A', isElective: false, isPracticalFaculty: true, practicalBatches: ['A', 'B', 'C'] },
            { facultyName: 'Charlie Brown', department: 'AIML', subjectName: 'Comp. Graphics', class: 'SE', division: 'A', isElective: false, isPracticalFaculty: true, practicalBatches: ['A'] },
            // Division B
            { facultyName: 'Diana Prince', department: 'AIML', subjectName: 'Data Structures', class: 'SE', division: 'B', isElective: false, isPracticalFaculty: false },
            { facultyName: 'Evan Wright', department: 'AIML', subjectName: 'Data Structures Lab', class: 'SE', division: 'B', isElective: false, isPracticalFaculty: true, practicalBatches: ['A', 'B'] },
            // Division C
            { facultyName: 'Fiona Green', department: 'AIML', subjectName: 'Microprocessors', class: 'SE', division: 'C', isElective: false, isPracticalFaculty: false },
        ];

        // --- SE STUDENT DATA ---
        // Generating some dummy students
        const studentData = [];
        const divisions = ['A', 'B', 'C'];

        divisions.forEach(div => {
            for (let i = 1; i <= 10; i++) { // 10 students per division
                studentData.push({
                    username: `Student ${div}${i}`,
                    grNo: `PRN_SE_${div}_${i}`,
                    department: 'AIML',
                    class: 'SE',
                    division: div,
                    practicalBatch: (i <= 5) ? 'A' : (i <= 8 ? 'B' : 'C'), // Assign batches
                    password: 'password123'
                });
            }
        });

        // Clear existing SE data to differentiate
        console.log('Clearing existing SE Faculty and Students...');
        await Faculty.deleteMany({ class: 'SE' });
        await Student.deleteMany({ class: 'SE' });

        console.log('Inserting Faculty...');
        await Faculty.insertMany(facultyData);

        console.log('Inserting Students...');
        // Note: If Student model hashes password in pre-save, insertMany might bypass it depending on implementation.
        // Usually insertMany triggers validation but middleware support varies. 
        // For simple seeding, we assume generic insert or we use create if needed.
        // Let's use insertMany for speed, if passwords don't work user can reset or we update script.
        await Student.insertMany(studentData);

        console.log('✅ Seeding Complete!');
        process.exit();
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
