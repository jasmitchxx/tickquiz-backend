const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// GET TOP SCORERS
router.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'results.json');

  if (!fs.existsSync(filePath)) {
    return res.status(200).json([]); // Return empty array if no results yet
  }

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const results = JSON.parse(data);

    // Sort by score (descending), then limit to top 10
    const topResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.status(200).json(topResults);
  } catch (error) {
    console.error('Error reading leaderboard:', error);
    res.status(500).json({ message: 'Failed to load leaderboard.' });
  }
});

module.exports = router;