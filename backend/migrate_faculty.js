import mongoose from 'mongoose';
import dotenv from 'dotenv';
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

const migrateFaculty = async () => {
    await connectDB();

    try {
        const result = await Faculty.updateMany(
            { department: 'Computer - AIML' },
            { $set: { department: 'AIML' } }
        );

        console.log(`Migration Complete:`);
        console.log(`Matched: ${result.matchedCount}`);
        console.log(`Modified: ${result.modifiedCount}`);

    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        mongoose.connection.close();
    }
};

migrateFaculty();
