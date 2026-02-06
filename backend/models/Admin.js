import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, 'Username is required'],
            unique: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
        },
        role: {
            type: String,
            default: 'admin',
            enum: ['admin'],
        },
        department: {
            type: String,
            required: [true, 'Department is required'],
            enum: ['Comps', 'IT', 'AIML', 'DS', 'Auto', 'All'],
            default: 'All',
        },
    },
    {
        timestamps: true,
    }
);

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
