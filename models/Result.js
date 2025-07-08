const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  name: { type: String, required: true },
  school: { type: String, required: true },
  score: { type: Number, required: true },
  total: { type: Number, default: 60 },
  subject: {
    type: String,
    required: true,
    enum: [
      // SHS Subjects
      "Physics", "Chemistry", "Add Maths", "Biology", "Core Maths",
      "Core Science", "Economics", "Geography", "Electiveict",
      "English", "Socialstudies", "Accounting", "Cost Accounting",
      "Business Management",
      // JHS Subjects
      "English Language", "Maths", "Social Studies", "Career Tech",
      "Computing", "RME", "French", "Creative Arts and Design"
    ],
  },
  level: {
    type: String,
    enum: ["SHS", "JHS"],
    required: false,
  },
  code: {
    type: String,
    required: false,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Result', resultSchema);