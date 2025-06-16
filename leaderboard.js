const express = require('express');
const router = express.Router();
const Result = require('./models/Result'); // Ensure the path is correct

// GET /api/leaderboard
router.get('/', async (req, res) => {
  try {
    const topResults = await Result.find()
      .sort({ score: -1, submittedAt: 1 }) // Highest score first, earliest submitted first on tie
      .limit(10); // Only top 10 entries

    res.status(200).json(topResults);
  } catch (error) {
    console.error('? Error fetching leaderboard from MongoDB:', error);
    res.status(500).json({ success: false, message: 'Failed to load leaderboard.' });
  }
});

module.exports = router;