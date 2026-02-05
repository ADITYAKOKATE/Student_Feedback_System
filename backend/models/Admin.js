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
    },
    {
        timestamps: true,
    }
);

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
