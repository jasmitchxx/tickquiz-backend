require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const fetch = require('node-fetch');
const crypto = require('crypto');

const Result = require('./models/Result');
const AccessCode = require('./models/AccessCode');
const leaderboardRouter = require('./leaderboard');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

const app = express();

// CORS configuration
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

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is awake' });
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('? Connected to MongoDB Atlas'))
  .catch(err => console.error('? MongoDB connection failed:', err));

// Generate Access Code
function generateAccessCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

//
// ?? Initiate Payment
//
app.post('/api/initiate-payment', async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email || !phone)
    return res.status(400).json({ message: 'Name, email, and phone are required.' });

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
    res.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    });
  } catch (error) {
    console.error('? Payment init error:', error.message);
    res.status(500).json({ message: 'Payment initiation failed.' });
  }
});

//
// ?? Webhook for Paystack (RAW body fix)
//
app.post(
  '/paystack/webhook',
  bodyParser.raw({ type: 'application/json' }), // <- important
  async (req, res) => {
    try {
      // verify signature
      const hash = crypto
        .createHmac('sha512', PAYSTACK_SECRET_KEY)
        .update(req.body)
        .digest('hex');

      if (hash !== req.headers['x-paystack-signature']) {
        console.log('? Invalid webhook signature');
        return res.sendStatus(401);
      }

      // parse JSON after verifying signature
      const event = JSON.parse(req.body);

      if (event.event === 'charge.success') {
        const { reference, metadata } = event.data;
        const { name, phone } = metadata || {};

        if (!name || !phone) return res.sendStatus(200);

        const existing = await AccessCode.findOne({ reference });
        if (existing) return res.sendStatus(200); // already processed

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
          reference,
          createdAt: new Date(),
        });

        await codeData.save();
        console.log(`? Access code generated via webhook: ${accessCode}`);
      }

      res.sendStatus(200);
    } catch (err) {
      console.error('? Webhook processing error:', err.message);
      res.sendStatus(500);
    }
  }
);

//
// ?? Check Payment Status (for frontend polling)
//
app.get('/api/check-payment/:reference', async (req, res) => {
  const { reference } = req.params;
  const code = await AccessCode.findOne({ reference });
  if (code) return res.json({ success: true, accessCode: code.code });
  res.json({ success: false });
});

//
// ?? Old verify endpoint (backup)
//
app.post('/api/verify-payment', async (req, res) => {
  const { reference } = req.body;
  try {
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    });
    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data.status !== 'success')
      return res.status(400).json({ success: false });

    return res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

//
// ?? Use Access Code
//
app.post('/api/use-access-code', async (req, res) => {
  const { code } = req.body;
  const codeEntry = await AccessCode.findOne({ code });
  if (!codeEntry) return res.status(404).json({ success: false });
  if (codeEntry.usageCount >= codeEntry.maxUsage) return res.status(403).json({ success: false });

  codeEntry.usageCount += 1;
  await codeEntry.save();
  res.json({ success: true });
});

//
// ?? Save Result
//
app.post('/api/save-result', async (req, res) => {
  try {
    const { name, school, score, subject } = req.body;
    const result = new Result({ name, school, score, subject });
    await result.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

//
// ?? Leaderboard
//
app.use('/api/leaderboard', leaderboardRouter);

app.get('/', (req, res) => {
  res.send('? TickQuiz Backend Running');
});

app.listen(PORT, () => {
  console.log(`?? Server running on port ${PORT}`);
});