const express = require('express');
const router = express.Router();
const Result = require('../models/Result');

// Escape regex for safe Mongo query
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ? POST /api/save-result
router.post('/save-result', async (req, res) => {
  try {
    const {
      name = 'Unknown',
      school = 'Unknown School',
      subject = 'general',
      score,
      code = null,
      timestamp,
      level = null,
      total = 60,
    } = req.body;

    if (score === undefined || score === null) {
      return res.status(400).json({
        success: false,
        message: 'Score is required.',
      });
    }

    const safeName = typeof name === 'string' ? name.trim() : 'Unknown';
    const safeSchool = typeof school === 'string' ? school.trim() : 'Unknown School';
    const safeSubject = typeof subject === 'string' ? subject.trim().toLowerCase() : 'general';
    const safeLevel = typeof level === 'string' ? level.trim().toLowerCase() : null;
    const safeCode = typeof code === 'string' ? code : null;
    const safeTimestamp = timestamp ? new Date(timestamp) : new Date();

    const newResult = new Result({
      name: safeName,
      school: safeSchool,
      subject: safeSubject,
      level: safeLevel,
      score: Number(score),
      total: Number(total),
      code: safeCode,
      submittedAt: safeTimestamp,
    });

    await newResult.save();

    res.status(201).json({ success: true, message: 'Result saved with defaults where needed.' });
  } catch (error) {
    console.error('? Error saving result:', error);
    res.status(500).json({ success: false, message: 'Failed to save result.' });
  }
});

// ? GET /api/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const subjectRaw = req.query.subject || 'general';
    const levelRaw = req.query.level || null;

    const subject = subjectRaw.trim().toLowerCase();
    const level = levelRaw ? levelRaw.trim().toLowerCase() : null;

    const filters = {
      subject: new RegExp(`^${escapeRegex(subject)}$`, 'i'),
    };

    if (level) {
      filters.level = new RegExp(`^${escapeRegex(level)}$`, 'i');
    }

    if (req.query.startDate || req.query.endDate) {
      filters.submittedAt = {};
      if (req.query.startDate) {
        filters.submittedAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        filters.submittedAt.$lte = end;
      }
    }

    const resultsRaw = await Result.find(filters)
      .sort({ score: -1, submittedAt: 1 })
      .limit(10);

    const results = resultsRaw.map((r) => {
      const total = r.total || 60;
      const percentage = ((r.score / total) * 100).toFixed(2);
      return {
        name: r.name || 'Unknown',
        school: r.school || 'Unknown School',
        score: r.score,
        total,
        percentage: Number(percentage),
        subject: r.subject || 'general',
        level: r.level || null,
        submittedAt: r.submittedAt,
        code: r.code || null,
      };
    });

    res.json({ success: true, results });
  } catch (error) {
    console.error('? Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load leaderboard',
    });
  }
});

module.exports = router;
