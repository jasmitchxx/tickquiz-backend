const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// GET TOP 10 PERFORMERS
router.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'results.json');

  if (!fs.existsSync(filePath)) {
    return res.status(200).json([]);
  }

  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const results = JSON.parse(data);

    // Sort results by highest score
    const sortedResults = results.sort((a, b) => b.score - a.score);

    // Get top 10
    const top10 = sortedResults.slice(0, 10).map(({ name, school, score }) => ({
      name,
      school,
      score,
    }));

    res.status(200).json(top10);
  } catch (err) {
    console.error('? Error reading leaderboard:', err);
    res.status(500).json({ error: 'Failed to load leaderboard.' });
  }
});

module.exports = router;