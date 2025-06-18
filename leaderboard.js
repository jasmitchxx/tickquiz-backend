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

    res.json(results); // Frontend expects just an array
  } catch (error) {
    console.error('? Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: 'Server error fetching leaderboard.' });
  }
});

// DELETE /api/leaderboard
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

    res.json({ success: true, message: 'Leaderboard reset.', deletedCount: result.deletedCount });
  } catch (err) {
    console.error('? Error resetting leaderboard:', err);
    res.status(500).json({ success: false, message: 'Server error during leaderboard reset.' });
  }
});

module.exports = router;