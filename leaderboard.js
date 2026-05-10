
const express = require('express');
const router = express.Router();
const Result = require('./models/Result');

// ================= HOMEPAGE CHAMPIONS =================
router.get('/homepage-champions', async (req, res) => {
  try {

    const maths = await Result.findOne({
      subject: /(math|mathematics)/i
    })
    .sort({ score: -1 })
    .select('name school');

    const science = await Result.findOne({
      subject: /science/i
    })
    .sort({ score: -1 })
    .select('name school');

    const english = await Result.findOne({
      subject: /english/i
    })
    .sort({ score: -1 })
    .select('name school');

    res.json({
      success: true,
      maths,
      science,
      english
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false
    });

  }
});

  


// ================= MAIN LEADERBOARD =================
router.get('/', async (req, res) => {
  try {

    const { subject } = req.query;

    if (!subject) {
      return res.status(400).json({
        success: false,
        message: 'Subject required'
      });
    }

    const results = await Result.find({
      subject: new RegExp(subject, 'i')
    })
    .sort({ score: -1, submittedAt: -1 })
    .limit(10);

    res.json({
      success: true,
      results
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      message: 'Server error'
    });

  }
});

// ================= SAVE RESULT =================
router.post('/', async (req, res) => {
  try {

    const {
      name,
      school,
      score,
      subject,
      level
    } = req.body;

    const result = new Result({
      name,
      school,
      score,
      subject,
      level
    });

    await result.save();

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false
    });

  }
});

module.exports = router;

