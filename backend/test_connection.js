
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const testConnection = async () => {
    try {
        console.log('Attempting to connect with URI:', process.env.MONGODB_URI.split('@')[1] || '...hidden...'); // mask password
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`✅ Connected to host: ${conn.connection.host}`);
        console.log(`✅ Database Name: ${conn.connection.name}`);

        // List all databases
        const admin = new mongoose.mongo.Admin(mongoose.connection.db);
        const result = await admin.listDatabases();
        console.log('\nAvailable Databases:');
        result.databases.forEach(db => console.log(` - ${db.name} (size: ${db.sizeOnDisk})`));

        // List collections in current DB
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`\nCollections in '${conn.connection.name}':`);
        if (collections.length === 0) {
            console.log(' - (No collections found. This database may not be visible in some tools)');
        } else {
            collections.forEach(c => console.log(` - ${c.name}`));
        }

        mongoose.disconnect();
    } catch (error) {
        console.error('❌ Connection Failed:', error);
    }
};

testConnection();
