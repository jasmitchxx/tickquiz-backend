const express = require('express');
const router = express.Router();
const Result = require('../models/Result');

// Escape regex for safe Mongo query
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ? POST /api/save-result
router.post('/save-result', async (req, res) => {
  const { name, school, subject, score, code, timestamp, level, total } = req.body;

  if (!name || !school || !subject || !code || score === undefined || !timestamp) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: name, school, subject, score, code, or timestamp.',
    });
  }

  try {
    const normalizedSubject = subject.trim().toLowerCase();

    const newResult = new Result({
      name,
      school,
      subject: normalizedSubject,
      level: level?.trim() || null,
      score,
      total: total || 60,
      code,
      submittedAt: new Date(timestamp),
    });

    await newResult.save();

    res.status(201).json({ success: true, message: 'Result saved successfully!' });
  } catch (error) {
    console.error('? Error saving result:', error);
    res.status(500).json({ success: false, message: 'Failed to save result.' });
  }
});

// ? GET /api/leaderboard?subject=physics&level=easy&startDate=2025-07-01&endDate=2025-07-05
router.get('/leaderboard', async (req, res) => {
  const { subject, level, startDate, endDate } = req.query;

  if (!subject) {
    return res.status(400).json({
      success: false,
      message: 'Subject is required in query',
    });
  }

  try {
    const filters = {
      subject: new RegExp(`^${escapeRegex(subject.trim().toLowerCase())}$`, 'i'),
    };

    if (level) {
      filters.level = new RegExp(`^${escapeRegex(level.trim())}$`, 'i');
    }

    if (startDate || endDate) {
      filters.submittedAt = {};
      if (startDate) {
        filters.submittedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filters.submittedAt.$lte = end;
      }
    }

    const resultsRaw = await Result.find(filters)
      .sort({ score: -1, submittedAt: 1 }) // Score descending, earliest first
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