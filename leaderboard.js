const express = require('express');
const router = express.Router();
const Result = require('./models/Result');

// Helper function to escape regex characters in subject
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/leaderboard?subject=Physics
router.get('/', async (req, res) => {
  const { subject } = req.query;

  if (!subject) {
    return res.status(400).json({ success: false, message: 'Subject is required in query.' });
  }

  try {
    const safeSubject = new RegExp(`^${escapeRegex(subject)}$`, 'i');
    const results = await Result.find({ subject: safeSubject })
      .sort({ score: -1, submittedAt: -1 })
      .limit(50);

    // ? Wrapped response for frontend compatibility
    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('? Error fetching leaderboard:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching leaderboard.' });
  }
});

// ? POST /api/leaderboard — Save a user's result
router.post('/', async (req, res) => {
  try {
    const { name, school, score, subject } = req.body;

    // Validate input
    if (!name || typeof score !== 'number' || !subject) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const normalizedSubject = subject.toLowerCase().replace(/\s+/g, '');

    const newResult = new Result({
      name,
      school: school || 'Unknown',
      score,
      subject: normalizedSubject,
      submittedAt: new Date(),
    });

    await newResult.save();
    res.json({ success: true, message: 'Result saved successfully.' });

  } catch (error) {
    console.error('? Error saving result:', error);
    res.status(500).json({ success: false, message: 'Error saving result.' });
  }
});

// DELETE /api/leaderboard — Admin-only reset
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
    const safeSubject = new RegExp(`^${escapeRegex(subject)}$`, 'i');
    const result = await Result.deleteMany({ subject: safeSubject });

    return res.json({ success: true, message: 'Leaderboard reset.', deletedCount: result.deletedCount });
  } catch (err) {
    console.error('? Error resetting leaderboard:', err);
    return res.status(500).json({ success: false, message: 'Server error during leaderboard reset.' });
  }
});

module.exports = router;