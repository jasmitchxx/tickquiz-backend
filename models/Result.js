const mongoose = require('mongoose');

// List of allowed subjects with proper casing
const ALLOWED_SUBJECTS = [
  // SHS Subjects
  "Physics",
  "Chemistry",
  "Biology",
  "Core Maths",
  "Add Maths",
  "English",
  "Social Studies",
  "Geography",
  "Economics",
  "Elective ICT",
  "Accounting",
  "Cost Accounting",
  "Business Management",

  // JHS Subjects
  "English Language",
  "Maths",
  "Core Science",
  "Career Tech",
  "Computing",
  "RME",
  "French",
  "Creative Arts and Design",
  "Social Studies"
];

// Map of subject aliases (lowercase, no spaces) to standardized names
const SUBJECT_MAP = ALLOWED_SUBJECTS.reduce((map, subject) => {
  const key = subject.toLowerCase().replace(/\s+/g, '');
  map[key] = subject;
  return map;
}, {});

// Helper to normalize subject
function normalizeSubject(input) {
  if (!input || typeof input !== 'string') return null;
  const key = input.toLowerCase().replace(/\s+/g, '');
  return SUBJECT_MAP[key] || null;
}

// Helper to normalize level
function normalizeLevel(level) {
  if (!level || typeof level !== 'string') return null;
  const upper = level.toUpperCase();
  return ["SHS", "JHS"].includes(upper) ? upper : null;
}

const resultSchema = new mongoose.Schema({
  name: { type: String, required: true },
  school: { type: String, required: true },
  score: { type: Number, required: true },
  total: { type: Number, default: 60 },
  subject: {
    type: String,
    required: true,
    enum: ALLOWED_SUBJECTS,
  },
  level: {
    type: String,
    enum: ["SHS", "JHS"],
    default: "SHS",
  },
  code: {
    type: String,
    required: false,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true
});

// Normalize subject and level before saving
resultSchema.pre('validate', function (next) {
  if (this.subject) {
    const normalized = normalizeSubject(this.subject);
    if (!normalized) {
      return next(new Error(`Invalid subject: ${this.subject}`));
    }
    this.subject = normalized;
  }

  if (this.level) {
    const normalized = normalizeLevel(this.level);
    if (!normalized) {
      return next(new Error(`Invalid level: ${this.level}`));
    }
    this.level = normalized;
  }

  next();
});

module.exports = mongoose.model('Result', resultSchema);