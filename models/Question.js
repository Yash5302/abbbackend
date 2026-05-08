const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    "Speaker Name": {
        type: String,
        required: true
    },
    "Question": {
        type: String,
        required: true
    },
    "Category": {
        type: String,
        required: true
    },
    "Short Summary": {
        type: String
    },
    "Summery": {
        type: String
    },
    "Detailed Points": {
        type: String
    },
    "Source": {
        type: String
    }
}, {
    timestamps: true,
    toJSON: { 
        versionKey: false,
        transform: (doc, ret) => {
            delete ret._id;
            return ret;
        }
    }
});

// Create a compound index to prevent exact duplicates of Question by the same Speaker
QuestionSchema.index({ "Speaker Name": 1, "Question": 1 }, { unique: true });

module.exports = mongoose.model('Question', QuestionSchema);
