require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fetch = require('node-fetch');

const Result = require('./models/Result');
const AccessCode = require('./models/AccessCode');
const leaderboardRouter = require('./leaderboard');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

const app = express();

// ================= CORS =================
const corsOptions = {
  origin: [
    'https://tickquiz.com',
    'http://localhost:3000',
    'https://tickquiz-frontend.onrender.com',
    'https://tickquiz.netlify.app',
  ],
  methods: ['GET', 'POST'],
};

app.use(cors(corsOptions));
app.use(express.json());

// ================= DATABASE =================
mongoose.connect(MONGODB_URI)
  .then(() => console.log('? Connected to MongoDB Atlas'))
  .catch((err) => console.error('? MongoDB connection failed:', err));

// ================= SUBJECTS =================
const allowedSubjects = [
  "Physics", "Chemistry", "Biology", "CoreMaths", "AddMaths",
  "English", "SocialStudies", "Geography", "Economics",
  "ElectiveICT", "Accounting", "CostAccounting", "BusinessManagement",
  "EnglishLanguage", "Maths", "CoreScience", "CareerTech",
  "Computing", "RME", "French","Crs","CreativeArtsAndDesign"
];

// ================= GENERATE CODE =================
function generateAccessCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ================= INITIATE PAYMENT =================
app.post('/api/initiate-payment', async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ message: 'All fields required.' });
  }

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: 1000,
        callback_url: 'https://tickquiz.netlify.app/verify',
        metadata: { name, phone },
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({ message: 'Payment init failed' });
    }

    res.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });

  } catch (error) {
    console.error('? Payment init error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ================= VERIFY PAYMENT =================
app.post('/api/verify-payment', async (req, res) => {
  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ success: false, message: 'Reference required' });
  }

  try {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Payment not successful' });
    }

    // Prevent duplicate
    const existing = await AccessCode.findOne({ reference });
    if (existing) {
      return res.json({
        success: true,
        accessCode: existing.code,
        name: existing.name
      });
    }

    const { name, phone } = verifyData.data.metadata || {};

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Metadata missing' });
    }

    // Generate unique code
    let accessCode;
    do {
      accessCode = generateAccessCode();
    } while (await AccessCode.findOne({ code: accessCode }));

    const newCode = new AccessCode({
      code: accessCode,
      usageCount: 0, // no longer used
      maxUsage: null, // unlimited
      name,
      phone,
      reference,
      createdAt: new Date(),
    });

    await newCode.save();

    console.log(`? Code generated: ${accessCode}`);

    res.json({
      success: true,
      accessCode,
      name
    });

  } catch (error) {
    console.error('? Verification error:', error.message);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// ================= USE ACCESS CODE =================
app.post('/api/use-access-code', async (req, res) => {
  const { code } = req.body;

  try {
    const entry = await AccessCode.findOne({ code });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Invalid code' });
    }

    // ? No limit — frontend controls attempts
    res.json({
      success: true,
      name: entry.name,
      message: 'Access granted'
    });

  } catch (err) {
    console.error('Use access code error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ================= SAVE RESULT =================
app.post('/api/save-result', async (req, res) => {
  try {
    const { name, school, score, subject } = req.body;

    if (!name || !school || score == null || !subject) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    const numericScore = Number(score);
    if (isNaN(numericScore)) {
      return res.status(400).json({ success: false, message: 'Invalid score' });
    }

    const valid = allowedSubjects.find(
      s => s.toLowerCase() === subject.toLowerCase()
    );

    if (!valid) {
      return res.status(400).json({ success: false, message: 'Invalid subject' });
    }

    const result = new Result({
      name,
      school,
      score: numericScore,
      subject: valid,
    });

    await result.save();

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

// ================= LEADERBOARD =================
app.use('/api/leaderboard', leaderboardRouter);

// ================= ROOT =================
app.get('/', (req, res) => {
  res.send('?? TickQuiz Backend Running');
});

// ================= AUTO WAKE =================
setInterval(async () => {
  try {
    await fetch('https://tickquiz-backend.onrender.com/');
    console.log('?? Pinged self');
  } catch (err) {
    console.log('Ping failed');
  }
}, 300000);

// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`?? Server running on port ${PORT}`);
});

