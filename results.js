const express = require('express');
const router = express.Router();
const Result = require('./models/Result'); // Ensure this model has name, school, score, subject, code, submittedAt

// POST /api/save-result
router.post('/', async (req, res) => {
  const { name, school, subject, score, code, timestamp } = req.body;

  if (!name || !school || !subject || !code || score === undefined || !timestamp) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: name, school, subject, score, code, or timestamp.',
    });
  }

  try {
    const newResult = new Result({
      name,
      school,
      subject,
      score,
      code,
      submittedAt: new Date(timestamp),
    });

    await newResult.save();

    res.status(201).json({ success: true, message: 'Result saved successfully!' });
  } catch (error) {
    console.error('? Error saving result to MongoDB:', error);
    res.status(500).json({ success: false, message: 'Failed to save result.' });
  }
});

module.exports = router;