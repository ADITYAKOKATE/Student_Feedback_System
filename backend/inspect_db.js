import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './models/Student.js';

dotenv.config();

const inspectStudents = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const students = await Student.find({});
        console.log(`Found ${students.length} students.`);

        students.forEach(s => {
            console.log('------------------------------------------------');
            console.log(`ID: ${s._id}`);
            console.log(`GR No: ${s.grNo}`);
            console.log(`Username: ${s.username}`);
            console.log(`Password (Hash): ${s.password.substring(0, 20)}...`);
            console.log(`Eligibility: ${s.eligibility}`);
        });

        mongoose.disconnect();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

inspectStudents();
