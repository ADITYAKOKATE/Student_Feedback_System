import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true,
        },
        faculty: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Faculty',
            required: function () {
                return this.feedbackType === 'theory' || this.feedbackType === 'practical';
            },
        },
        feedbackType: {
            type: String,
            required: [true, 'Feedback type is required'],
            enum: ['theory', 'practical', 'library', 'other_facilities'],
        },
        department: {
            type: String,
            required: true,
            trim: true,
        },
        class: {
            type: String,
            required: true,
            trim: true,
        },
        division: {
            type: String,
            required: true,
            trim: true,
        },
        // Feedback ratings - can be customized based on actual feedback form
        ratings: {
            type: Map,
            of: Number,
            // Example: { "teaching_quality": 5, "communication": 4, "subject_knowledge": 5 }
        },
        comments: {
            type: String,
            trim: true,
            default: '',
        },
        submittedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Create compound indexes for efficient queries
feedbackSchema.index({ faculty: 1, feedbackType: 1 });
feedbackSchema.index({ student: 1, feedbackType: 1 });
feedbackSchema.index({ department: 1, class: 1, division: 1, feedbackType: 1 });
feedbackSchema.index({ submittedAt: -1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
