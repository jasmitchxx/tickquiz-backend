require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const twilio = require('twilio');
const fetch = require('node-fetch');

const Result = require('./models/Result');
const AccessCode = require('./models/AccessCode');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

const client = twilio(accountSid, authToken);
const app = express();

// CORS
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

// MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('? Connected to MongoDB Atlas'))
  .catch((err) => console.error('? MongoDB connection failed:', err));

// Helper: Generate Access Code
function generateAccessCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// INITIATE PAYMENT
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
    if (!data.status) return res.status(400).json({ message: 'Failed to initiate payment.' });

    res.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('? Error initiating payment:', error.message);
    res.status(500).json({ message: 'Error initiating payment.' });
  }
});

// VERIFY PAYMENT
app.post('/api/verify-payment', async (req, res) => {
  const { reference } = req.body;
  if (!reference) return res.status(400).json({ success: false, message: 'Reference is required.' });

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
      body: `?? Hello ${name}, your TickQuiz access code is: ${accessCode}`,
      from: twilioPhone,
      to: phone,
    });

    console.log(`? Code sent to ${phone}: ${accessCode}`);
    res.status(200).json({ success: true, message: 'Payment verified. Access code sent!', accessCode, phone });
  } catch (error) {
    console.error('? Verification error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to verify payment.' });
  }
});

// REDIRECT VERIFY
app.get('/verify-payment', (req, res) => {
  const { reference } = req.query;
  if (!reference) return res.redirect('https://tickquiz.com/');
  return res.redirect(`https://tickquiz.com/verify?reference=${reference}`);
});

// USE ACCESS CODE
app.post('/api/use-access-code', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: 'Access code is required.' });

  const codeEntry = await AccessCode.findOne({ code });
  if (!codeEntry) return res.status(404).json({ success: false, message: 'Invalid access code.' });
  if (codeEntry.usageCount >= codeEntry.maxUsage) {
    return res.status(403).json({ success: false, message: 'Access code has expired.' });
  }

  codeEntry.usageCount += 1;
  await codeEntry.save();

  return res.status(200).json({ success: true, message: 'Access granted.', usageCount: codeEntry.usageCount });
});

// SAVE RESULT ? Updated
app.post('/api/save-result', async (req, res) => {
  try {
    const { name, school, score, subject } = req.body;

    if (!name || !school || score == null || !subject) {
      return res.status(400).json({ success: false, message: 'All fields (name, school, score, subject) are required.' });
    }

    const result = new Result({
      name,
      school,
      score,
      subject: subject.toLowerCase(),
    });

    await result.save();
    res.status(200).json({ success: true, message: 'Result saved successfully.' });
  } catch (error) {
    console.error('? Error saving result:', error.message);
    res.status(500).json({ success: false, message: 'Failed to save result.' });
  }
});

// LEADERBOARD ? Updated
app.get('/api/leaderboard', async (req, res) => {
  try {
    const { subject } = req.query;
    const allowedSubjects = ['math', 'english', 'science', 'socialstudies'];

    if (subject && !allowedSubjects.includes(subject.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Invalid subject.' });
    }

    const filter = subject ? { subject: subject.toLowerCase() } : {};
    const results = await Result.find(filter)
      .sort({ score: -1, submittedAt: 1 })
      .limit(10);

    res.status(200).json(results);
  } catch (error) {
    console.error('? Error fetching leaderboard:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load leaderboard.' });
  }
});

// HOME
app.get('/', (req, res) => {
  res.send('? TickQuiz Backend is running.');
});

// START SERVER
app.listen(PORT, () => {
  console.log(`?? Server running on port ${PORT}`);
});