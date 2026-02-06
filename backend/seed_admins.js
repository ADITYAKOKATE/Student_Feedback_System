import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './models/Admin.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

const admins = [
    { username: 'comps_admin', password: 'password123', department: 'Comps' },
    { username: 'it_admin', password: 'password123', department: 'IT' },
    { username: 'aiml_admin', password: 'password123', department: 'AIML' },
    { username: 'ds_admin', password: 'password123', department: 'DS' },
    { username: 'auto_admin', password: 'password123', department: 'Auto' },
];

const seedAdmins = async () => {
    try {
        const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!uri) throw new Error('MongoDB URI is missing');

        await mongoose.connect(uri);
        console.log('MongoDB Connected');

        for (const adminData of admins) {
            // Check if exists
            const exists = await Admin.findOne({ username: adminData.username });
            if (exists) {
                console.log(`Admin ${adminData.username} already exists. Skipping.`);
            } else {
                await Admin.create(adminData);
                console.log(`Created admin: ${adminData.username} for ${adminData.department}`);
            }
        }

        console.log('Seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admins:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
};

if (!process.env.MONGO_URI && !process.env.MONGODB_URI) {
    console.error('FATAL: MONGO_URI (or MONGODB_URI) is not defined in environment variables.');
    // Attempt to load from default location if not loaded
    console.log('Current directory:', process.cwd());
}

seedAdmins();
