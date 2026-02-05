import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Student',
            required: true,
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
        // Theory Feedback Section
        theory: [{
            faculty: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Faculty',
            },
            subject: String,
            ratings: {
                type: Map,
                of: Number,
            },
            comments: {
                type: String,
                default: ''
            }
        }],
        // Practical Feedback Section
        practical: [{
            faculty: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Faculty',
            },
            subject: String,
            ratings: {
                type: Map,
                of: Number,
            },
            comments: {
                type: String,
                default: ''
            }
        }],
        // Library Feedback
        library: {
            ratings: {
                type: Map,
                of: Number,
            },
            comments: {
                type: String,
                default: ''
            }
        },
        // Other Facilities Feedback
        facilities: {
            ratings: {
                type: Map,
                of: Number,
            },
            comments: {
                type: String,
                default: ''
            }
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

// Index to ensure one submission per student (you might want to scope this by term/semester later)
feedbackSchema.index({ student: 1 }, { unique: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
