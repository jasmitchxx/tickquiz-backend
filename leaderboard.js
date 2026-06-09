
const express = require('express');
const router = express.Router();
const Result = require('./models/Result');

// ================= HOMEPAGE CHAMPIONS =================

router.get('/homepage-champions', async (req, res) => {
  try {

    // ================= SHS =================

    const shsMaths = await Result.findOne({
      subject: /(math|mathematics)/i,
      level: /shs/i
    })
    .sort({ score: -1 })
    .select('name school');

    const shsScience = await Result.findOne({
      subject: /science/i,
      level: /shs/i
    })
    .sort({ score: -1 })
    .select('name school');

    const shsEnglish = await Result.findOne({
      subject: /english/i,
      level: /shs/i
    })
    .sort({ score: -1 })
    .select('name school');

    // ================= JHS =================

    const jhsMaths = await Result.findOne({
      subject: /(math|mathematics)/i,
      level: /jhs/i
    })
    .sort({ score: -1 })
    .select('name school');

    const jhsScience = await Result.findOne({
      subject: /science/i,
      level: /jhs/i
    })
    .sort({ score: -1 })
    .select('name school');

    const jhsEnglish = await Result.findOne({
      subject: /english/i,
      level: /jhs/i
    })
    .sort({ score: -1 })
    .select('name school');

    res.json({
      success: true,

      shs: {
        maths: shsMaths,
        science: shsScience,
        english: shsEnglish
      },

      jhs: {
        maths: jhsMaths,
        science: jhsScience,
        english: jhsEnglish
      }

    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false
    });

  }
});


// ================= LEADERBOARD =================

router.get('/', async (req, res) => {

  try {

    const { subject, level } = req.query;

    const filter = {};

    if (subject) {
      filter.subject = subject;
    }

    if (level) {
      filter.level = level;
    }

    const results =
      await Result.find(filter)
      .sort({ score: -1 });

    res.json({
      results
    });

  } catch (err) {

    console.error(
      'LEADERBOARD ERROR:',
      err
    );

    res.status(500).json({
      message:
        'Failed to load leaderboard'
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

