const express = require('express');
const router = express.Router();
const Result = require('../models/Result'); // Adjust path if needed

// ? POST /api/save-result
router.post('/save-result', async (req, res) => {
  const { name, school, subject, score, code, timestamp } = req.body;

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
      score,
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

// ? GET /api/leaderboard?subject=physics
router.get('/leaderboard', async (req, res) => {
  const { subject } = req.query;

  if (!subject) {
    return res.status(400).json({
      success: false,
      message: 'Subject is required in query',
    });
  }

  try {
    const normalizedSubject = subject.trim().toLowerCase();

    const results = await Result.find({ subject: normalizedSubject })
      .sort({ score: -1, submittedAt: 1 }) // Top scores first, earliest tie-break
      .limit(10);

    res.json(results);
  } catch (error) {
    console.error('? Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load leaderboard',
    });
  }
});

module.exports = router;