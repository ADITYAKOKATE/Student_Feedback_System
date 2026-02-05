import mongoose from 'mongoose';

const facultySchema = new mongoose.Schema(
    {
        facultyName: {
            type: String,
            required: [true, 'Faculty name is required'],
            trim: true,
        },
        department: {
            type: String,
            required: [true, 'Department is required'],
            trim: true,
        },
        subjectName: {
            type: String,
            required: [true, 'Subject name is required'],
            trim: true,
        },
        class: {
            type: String,
            required: [true, 'Class is required'],
            trim: true,
            // e.g., "SE", "TE", "BE"
        },
        division: {
            type: String,
            required: [true, 'Division is required'],
            trim: true,
            // e.g., "A", "B", "C"
        },
        isElective: {
            type: Boolean,
            default: false,
        },
        isPracticalFaculty: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Create compound index for efficient queries
facultySchema.index({ class: 1, division: 1, department: 1 });

const Faculty = mongoose.model('Faculty', facultySchema);

export default Faculty;
