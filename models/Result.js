const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  name: { type: String, required: true },
  school: { type: String, required: true },
  score: { type: Number, required: true },
  total: { type: Number, default: 60 }, // ? Used to normalize percentage
  subject: {
    type: String,
    required: true,
    enum: [
      "Physics",
      "Chemistry",
      "Add Maths",
      "Biology",
      "Core Maths",
      "Core Science",
      "Economics",
      "Geography",
      "Electiveict",
      "English",
      "Socialstudies",
      "Accounting",
      "Cost Accounting",
      "Business Management"
    ],
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

// ? Export the model
module.exports = mongoose.model('Result', resultSchema);