const express = require('express');
const router = express.Router();
const Result = require('./models/Result'); // Ensure the model path is correct

// POST /api/save-result
router.post('/', async (req, res) => {
  const { name, school, score } = req.body;

  if (!name || !school || score === undefined) {
    return res.status(400).json({ success: false, message: 'Name, school, and score are required.' });
  }

  try {
    const newResult = new Result({
      name,
      school,
      score,
      submittedAt: new Date(),
    });

    await newResult.save();

    res.status(201).json({ success: true, message: 'Result saved successfully!' });
  } catch (error) {
    console.error('? Error saving result to MongoDB:', error);
    res.status(500).json({ success: false, message: 'Failed to save result.' });
  }
});

module.exports = router;