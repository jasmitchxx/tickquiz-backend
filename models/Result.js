// models/Result.js
const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  name: { type: String, required: true },
  school: { type: String, required: true },
  score: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Result', resultSchema);