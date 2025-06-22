const express = require('express');
const router = express.Router();
const Result = require('./models/Result');

// Escape regex characters in subject for safe querying
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
      .limit(10); // ?? Limit to top 10

    // Respond with { success, results } format
    return res.status(200).json({ success: true, results });
  } catch (error) {
    console.error('? Error fetching leaderboard:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching leaderboard.' });
  }
});

// POST /api/leaderboard — Save quiz result
router.post('/', async (req, res) => {
  try {
    const { name, school, score, subject } = req.body;

    if (!name || !subject || typeof score !== 'number') {
      return res.status(400).json({ success: false, message: 'Name, score, and subject are required.' });
    }

    const result = new Result({
      name: name.trim(),
      school: school?.trim() || 'Unknown',
      subject: subject.trim(),
      score,
      submittedAt: new Date(),
    });

    await result.save();

    return res.status(200).json({ success: true, message: 'Result saved successfully.' });
  } catch (error) {
    console.error('? Error saving result:', error);
    return res.status(500).json({ success: false, message: 'Error saving result.' });
  }
});

// DELETE /api/leaderboard — Admin reset
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