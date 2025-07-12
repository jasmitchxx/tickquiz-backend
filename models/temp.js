const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: 'Anonymous',
    },
    school: {
      type: String,
      trim: true,
      default: 'Unknown School',
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      default: 60,
      min: 1,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: [
        // SHS Subjects
        "physics", "chemistry", "biology", "coremaths", "addmaths",
        "english", "socialstudies", "geography", "economics",
        "electiveict", "accounting", "costaccounting", "businessmanagement",

        // JHS Subjects
        "englishlanguage", "maths", "corescience", "socialstudies",
        "careertech", "computing", "rme", "french", "creativeartsanddesign",
      ],
    },
    level: {
      type: String,
      trim: true,
      uppercase: true,
      enum: ["SHS", "JHS"],
      default: "SHS", // Optional fallback
    },
    code: {
      type: String,
      trim: true,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Result', resultSchema);
