require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const twilio = require('twilio');
const fetch = require('node-fetch');

const Result = require('./models/Result');
const AccessCode = require('./models/AccessCode');
const leaderboardRouter = require('./leaderboard');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

const client = twilio(accountSid, authToken);
const app = express();

const corsOptions = {
  origin: [
    'https://tickquiz.com',
    'http://localhost:3000',
    'https://tickquiz-frontend.onrender.com',
    'https://tickquiz.netlify.app',
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('? Connected to MongoDB Atlas'))
  .catch((err) => console.error('? MongoDB connection failed:', err));

// Allowed subjects
const allowedSubjects = [
 // SHS Subjects
"Physics", "Chemistry", "Biology", "CoreMaths", "AddMaths",
      "English", "SocialStudies", "Geography", "Economics",
      "ElectiveICT", "Accounting", "CostAccounting", "BusinessManagement",
// JHS Subjects
"EnglishLanguage", "Maths", "CoreScience", "SocialStudies",
      "CareerTech", "Computing", "RME", "French", "CreativeArtsAndDesign"
];

// Generate Access Code
function generateAccessCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Initiate Payment
app.post('/api/initiate-payment', async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ message: 'Name, email, and phone are required for payment.' });
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
        callback_url: 'https://tickquiz.com/verify',
        metadata: { name, phone },
      }),
    });

    const data = await response.json();

    if (!data.status) {
      return res.status(400).json({ message: 'Failed to initiate payment.' });
    }

    res.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('? Error initiating payment:', error.message);
    res.status(500).json({ message: 'Error initiating payment.' });
  }
});

// Verify Payment
app.post('/api/verify-payment', async (req, res) => {
  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ success: false, message: 'Reference is required.' });
  }

  try {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Payment not successful.' });
    }

    const { name, phone } = verifyData.data.metadata || {};
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Missing metadata for access code generation.' });
    }

    let accessCode;
    do {
      accessCode = generateAccessCode();
    } while (await AccessCode.findOne({ code: accessCode }));

    const codeData = new AccessCode({
      code: accessCode,
      usageCount: 0,
      maxUsage: 2,
      name,
      phone,
      createdAt: new Date(),
    });

    await codeData.save();

    await client.messages.create({
      body: `? Hello ${name}, your TickQuiz access code is: ${accessCode}`,
      from: twilioPhone,
      to: phone,
    });

    console.log(`?? Code sent to ${phone}: ${accessCode}`);

    res.status(200).json({ success: true, message: 'Payment verified. Access code sent!', accessCode, phone });
  } catch (error) {
    console.error('? Verification error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to verify payment.' });
  }
});

// Redirect after payment
app.get('/verify-payment', (req, res) => {
  const { reference } = req.query;
  if (!reference) return res.redirect('https://tickquiz.com/');
  return res.redirect(`https://tickquiz.com/verify?reference=${reference}`);
});

// Use Access Code
app.post('/api/use-access-code', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: 'Access code is required.' });
  }

  const codeEntry = await AccessCode.findOne({ code });

  if (!codeEntry) {
    return res.status(404).json({ success: false, message: 'Invalid access code.' });
  }

  if (codeEntry.usageCount >= codeEntry.maxUsage) {
    return res.status(403).json({ success: false, message: 'Access code has expired.' });
  }

  codeEntry.usageCount += 1;
  await codeEntry.save();

  return res.status(200).json({ success: true, message: 'Access granted.', usageCount: codeEntry.usageCount });
});

// Save Quiz Result
app.post('/api/save-result', async (req, res) => {
  try {
    const { name, school, score, subject } = req.body;

    if (!name || !school || score == null || !subject) {
      return res.status(400).json({ success: false, message: 'All fields (name, school, score, subject) are required.' });
    }

    const numericScore = Number(score);
    if (isNaN(numericScore)) {
      return res.status(400).json({ success: false, message: 'Score must be a valid number.' });
    }

    const normalizedSubjects = allowedSubjects.map((s) => s.toLowerCase());
    if (!normalizedSubjects.includes(subject.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Invalid subject submitted.' });
    }

    const properSubject = allowedSubjects.find(
      (s) => s.toLowerCase() === subject.toLowerCase()
    );

    const result = new Result({
      name,
      school,
      score: numericScore,
      subject: properSubject,
    });

    await result.save();
    res.status(200).json({ success: true, message: 'Result saved successfully.' });
  } catch (error) {
    console.error('? Error saving result:', {
      error: error.message,
      fields: req.body,
    });

    res.status(500).json({ success: false, message: 'Failed to save result.' });
  }
});

// Leaderboard route
app.use('/api/leaderboard', leaderboardRouter);

// Root route
app.get('/', (req, res) => {
  res.send('? TickQuiz Backend is running.');
});

// Start server
app.listen(PORT, () => {
  console.log(`?? Server running on port ${PORT}`);
});
