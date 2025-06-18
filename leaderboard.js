const express = require('express');
const router = express.Router();
const Result = require('./models/Result');

// GET /api/leaderboard?subject=Physics
router.get('/', async (req, res) => {
  const { subject } = req.query;

  if (!subject) {
    return res.status(400).json({ success: false, message: 'Subject is required in query.' });
  }

  try {
    // Case-insensitive match for subject
    const results = await Result.find({ subject: new RegExp(`^${subject}$`, 'i') })
      .sort({ score: -1, submittedAt: -1 }) // highest score, then most recent
      .limit(50);

    res.json({ success: true, results });
  } catch (error) {
    console.error('? Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: 'Server error fetching leaderboard.' });
  }
});

module.exports = router;