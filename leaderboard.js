// leaderboard.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const filePath = path.join(__dirname, 'results.json');

// GET /api/leaderboard
router.get('/', (req, res) => {
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'No results found.' });
  }

  try {
    const data = fs.readFileSync(filePath);
    const results = JSON.parse(data);

    const sorted = results
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.submittedAt) - new Date(b.submittedAt);
      })
      .slice(0, 10);

    res.status(200).json(sorted);
  } catch (error) {
    console.error('? Error loading leaderboard:', error);
    res.status(500).json({ success: false, message: 'Failed to load leaderboard.' });
  }
});

module.exports = router;