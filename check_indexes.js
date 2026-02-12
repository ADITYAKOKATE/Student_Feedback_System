
import mongoose from 'mongoose';
import Feedback from './backend/models/Feedback.js';
import dotenv from 'dotenv';

dotenv.config({ path: './backend/.env' });

const checkIndexes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const indexes = await Feedback.collection.getIndexes();
        console.log('Indexes on Feedback collection:');
        console.log(JSON.stringify(indexes, null, 2));

        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
};

checkIndexes();
