// models/Result.js
const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  name: String,
  school: String,
  score: Number,
  subject: {
    type: String,
    required: true,
    enum: ['math', 'science', 'english', 'socialstudies'], // add more if needed
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Result', resultSchema);