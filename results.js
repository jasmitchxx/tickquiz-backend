// results.js
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const filePath = path.join(__dirname, 'results.json');

// POST /api/save-result
router.post('/', (req, res) => {
  const { name, school, score, subject } = req.body;

  if (!name || !school || !subject || typeof score !== 'number') {
    return res.status(400).json({ success: false, message: 'Missing or invalid result data.' });
  }

  let results = [];

  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      results = JSON.parse(data);
    }

    const newResult = {
      name: name.trim(),
      school: school.trim(),
      subject: subject.trim(),
      score,
      submittedAt: new Date().toISOString(),
    };

    results.push(newResult);
    fs.writeFileSync(filePath, JSON.stringify(results, null, 2));

    res.status(200).json({ success: true, message: 'Result saved successfully.' });
  } catch (error) {
    console.error('? Error saving result:', error);
    res.status(500).json({ success: false, message: 'Failed to save result.' });
  }
});

module.exports = router;