const express = require('express');
const router = express.Router();
const Result = require('./models/Result');

// Normalization map must match what's in models/Result.js
const SUBJECT_MAP = {
  physics: "Physics",
  chemistry: "Chemistry",
  biology: "Biology",
  "coremaths": "Core Maths",
  "addmaths": "Add Maths",
  english: "English",
  "socialstudies": "Social Studies",
  geography: "Geography",
  economics: "Economics",
  electiveict: "Elective ICT",
  accounting: "Accounting",
  "costaccounting": "Cost Accounting",
  "businessmanagement": "Business Management",

  // JHS
  "englishlanguage": "English Language",
  maths: "Maths",
  "corescience": "Core Science",
  careertech: "Career Tech",
  computing: "Computing",
  rme: "RME",
  french: "French",
  "creativeartsanddesign": "Creative Arts and Design",
  socialstudies: "Social Studies",
};

const normalizeSubject = (input) => {
  if (!input) return null;
  const key = input.toLowerCase().replace(/\s+/g, '');
  return SUBJECT_MAP[key] || input.trim();
};

const normalizeLevel = (input) => {
  if (!input) return null;
  const normalized = input.toUpperCase();
  return ['SHS', 'JHS'].includes(normalized) ? normalized : input.trim();
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ? GET /api/leaderboard
router.get('/', async (req, res) => {
  const { subject, level, startDate, endDate } = req.query;

  if (!subject) {
    return res.status(400).json({ success: false, message: 'Subject is required in query.' });
  }

  try {
    const filters = {
      subject: new RegExp(`^${escapeRegex(normalizeSubject(subject))}$`, 'i'),
    };

    if (level) {
      filters.level = new RegExp(`^${escapeRegex(normalizeLevel(level))}$`, 'i');
    }

    if (startDate || endDate) {
      filters.submittedAt = {};
      if (startDate) filters.submittedAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filters.submittedAt.$lte = end;
      }
    }

    const resultsRaw = await Result.find(filters)
      .sort({ score: -1, submittedAt: -1 })
      .limit(10);

    const results = resultsRaw.map((r) => {
      const total = r.total || 60;
      const percentage = ((r.score / total) * 100).toFixed(2);
      return {
        name: r.name,
        school: r.school,
        score: r.score,
        total,
        percentage: Number(percentage),
        subject: r.subject,
        level: r.level || null,
        code: r.code || null,
        submittedAt: r.submittedAt,
      };
    });

    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('? Error fetching leaderboard:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching leaderboard.' });
  }
});

// ? POST /api/leaderboard
router.post('/', async (req, res) => {
  try {
    const { name, school, score, subject, total, code, level } = req.body;

    if (!name || !subject || typeof score !== 'number') {
      return res.status(400).json({ success: false, message: 'Name, score, and subject are required.' });
    }

    const result = new Result({
      name: name.trim(),
      school: school?.trim() || 'Unknown',
      subject: normalizeSubject(subject),
      level: normalizeLevel(level),
      score,
      total: total || 60,
      code: code || null,
      submittedAt: new Date(),
    });

    await result.save();

    return res.status(200).json({ success: true, message: 'Result saved successfully.' });
  } catch (error) {
    console.error('? Error saving result:', error.message);
    return res.status(500).json({ success: false, message: 'Error saving result.' });
  }
});

// ? DELETE /api/leaderboard
router.delete('/', async (req, res) => {
  const { subject, secret } = req.body;
  const ADMIN_SECRET = process.env.ADMIN_SECRET;

  if (!secret || secret !== ADMIN_SECRET) {
    return res.status(403).json({ success: false, message: 'Unauthorized: Invalid admin password.' });
  }

  if (!subject) {
    return res.status(400).json({ success: false, message: 'Subject is required to reset leaderboard.' });
  }

  try {
    const safeSubject = new RegExp(`^${escapeRegex(normalizeSubject(subject))}$`, 'i');
    const result = await Result.deleteMany({ subject: safeSubject });

    return res.status(200).json({
      success: true,
      message: 'Leaderboard reset.',
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error('? Error resetting leaderboard:', error);
    return res.status(500).json({ success: false, message: 'Server error during leaderboard reset.' });
  }
});

module.exports = router;