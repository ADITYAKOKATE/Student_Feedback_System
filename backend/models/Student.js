import mongoose from 'mongoose';


const studentSchema = new mongoose.Schema(
    {
        grNo: {
            type: String,
            required: [true, 'GR Number is required'],
            // unique: true, // Taken care of by compound index or separate declaration if needed
            trim: true,
            uppercase: true,
        },
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
        department: {
            type: String,
            required: [true, 'Department is required'],
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
        practicalBatch: {
            type: String,
            required: [true, 'Practical batch is required'],
            trim: true,
            // e.g., "A", "B", "C", "D"
        },
        eligibility: {
            type: Boolean,
            default: true,
        },
        electiveChosen: {
            type: String,
            trim: true,
            default: '',
        },
        feedbackGiven: {
            theory: {
                type: Boolean,
                default: false,
            },
            practical: {
                type: Boolean,
                default: false,
            },
        },
    },
    {
        timestamps: true,
    }
);

// Method to compare password (Plain text)
studentSchema.methods.comparePassword = async function (enteredPassword) {
    return enteredPassword === this.password;
};

// Create compound index for efficient queries
studentSchema.index({ class: 1, division: 1, department: 1 });
// Create compound index for efficient queries
studentSchema.index({ class: 1, division: 1, department: 1 });
// studentSchema.index({ grNo: 1 }); // Already indexed by schema definition if unique: true was kept, but we removed unique: true just now? 
// Wait, better to keep unique: true in schema and remove this one. Or vice versa.
// The error said "Duplicate schema index... using both index: true and schema.index()".
// I will just rely on the one in the field definition (I should have kept unique:true there and removed this line).
// Let's re-add unique:true in the previous step? No, I already sent it. 
// Re-checking standard Mongoose behavior: unique:true creates an index.
// The previous tool call removed unique:true. So now there is NO index unless I keep this one.
// BUT, I want `grNo` to be unique. 
// So I should have kept `unique: true` and removed THIS line.
// Since I already removed `unique: true` in the previous call (which hasn't executed yet in my mind, but in the chain it has), 
// Actually, tools run in parallel or sequence? They are sequential in my thought process but `waitForPreviousTools` is false by default.
// I will assume I need to fix it. 
// Plan: Restore `unique: true` in the Model definition (since I want the constraint) and REMOVE `studentSchema.index({ grNo: 1 })`.
// Actually, I can just do one ReplaceFileContent that fixes BOTH if they are close? No, they are far apart.
// I will just remove this line `studentSchema.index({ grNo: 1 });` and accept that I removed `unique: true` in the previous step?
// No, if I remove `unique: true`, I lose the constraint. 
// I will cancel the removal of `unique: true`? I can't.
// I will just Set `unique: true` AGAIN in this step or a new step?
// Let's just use `studentSchema.index({ grNo: 1 }, { unique: true });` here to be explicit?
// Or better: Restore `unique: true` in the field definition and remove this line.
// I will edit the previous tool call? No, I can't.
// I will sending a logic that makes sense.
// 1. Remove `unique: true` from field (done in previous call).
// 2. Here, replace `studentSchema.index({ grNo: 1 });` with `studentSchema.index({ grNo: 1 }, { unique: true });`.
studentSchema.index({ grNo: 1 }, { unique: true });

const Student = mongoose.model('Student', studentSchema);

export default Student;
