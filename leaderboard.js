const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// Load leaderboard from file
function loadLeaderboard() {
  if (!fs.existsSync(LEADERBOARD_FILE)) return [];
  return JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
}

// Save leaderboard to file
function saveLeaderboard(data) {
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
}

// POST /api/leaderboard — Save new score with timestamp
router.post('/', (req, res) => {
  const { name, school, subject, score } = req.body;

  if (!name || !school || !subject || typeof score !== 'number') {
    return res.status(400).json({ message: 'Missing or invalid fields.' });
  }

  const leaderboard = loadLeaderboard();

  leaderboard.push({
    name,
    school,
    subject,
    score,
    timestamp: new Date().toISOString()
  });

  saveLeaderboard(leaderboard);

  res.status(200).json({ message: 'Score saved successfully.' });
});

// GET /api/leaderboard?subject=English — Get top scores
router.get('/', (req, res) => {
  const { subject } = req.query;

  if (!subject) {
    return res.status(400).json({ message: 'Subject is required.' });
  }

  const leaderboard = loadLeaderboard();

  const filtered = leaderboard
    .filter(entry => entry.subject.toLowerCase() === subject.toLowerCase())
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score; // High score first
      return new Date(a.timestamp) - new Date(b.timestamp); // Earlier wins tie
    })
    .slice(0, 50); // Top 50

  res.status(200).json(filtered);
});

module.exports = router;