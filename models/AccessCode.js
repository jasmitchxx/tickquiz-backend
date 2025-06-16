// models/AccessCode.js
const mongoose = require('mongoose');

const accessCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  usageCount: { type: Number, default: 0 },
  maxUsage: { type: Number, default: 2 },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AccessCode', accessCodeSchema);
