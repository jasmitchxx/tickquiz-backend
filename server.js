require('dotenv').config(); // Load environment variables
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');
const fetch = require('node-fetch');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const PORT = process.env.PORT || 5000;

const client = twilio(accountSid, authToken);
const app = express();

const corsOptions = {
  origin: [
    'https://tickquiz.com',
    'http://localhost:3000',
    'https://tickquiz-frontend.onrender.com',
    'https://tickquiz.netlify.app'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json());

function generateAccessCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ? INITIATE PAYMENT — updated to 15.5 GHS
app.post('/api/initiate-payment', async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ message: 'Name, email, and phone are required for payment.' });
  }

  const amountKobo = 1550; // ? Updated from 2000 to 1550 for 15.5 GHS

  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountKobo,
        callback_url: "https://tickquiz.com/verify",
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

// VERIFY PAYMENT
app.post('/api/verify-payment', async (req, res) => {
  const { reference } = req.body;

  if (!reference) {
    return res.status(400).json({ success: false, message: 'Reference is required.' });
  }

  try {
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.status || verifyData.data.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Payment not successful.' });
    }

    const metadata = verifyData.data.metadata || {};
    const { name, phone } = metadata;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Missing metadata for access code generation.' });
    }

    const filePath = path.join(__dirname, 'accessCodes.json');
    let accessCodes = [];

    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath);
      accessCodes = JSON.parse(fileContent);
    }

    let accessCode;
    do {
      accessCode = generateAccessCode();
    } while (accessCodes.find(c => c.code === accessCode));

    const codeData = {
      code: accessCode,
      usageCount: 0,
      maxUsage: 2,
      name,
      phone,
      createdAt: new Date().toISOString()
    };

    accessCodes.push(codeData);
    fs.writeFileSync(filePath, JSON.stringify(accessCodes, null, 2));

    await client.messages.create({
      body: `? Hello ${name}, your TickQuiz access code is: ${accessCode}`,
      from: twilioPhone,
      to: phone
    });

    console.log(`? Payment verified & code sent to ${phone}: ${accessCode}`);
    res.status(200).json({ success: true, message: 'Payment verified. Access code sent!', accessCode, phone });

  } catch (error) {
    console.error('? Verification error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to verify payment.' });
  }
});

// REDIRECT VERIFY GET
app.get('/verify-payment', (req, res) => {
  const { reference } = req.query;
  if (!reference) return res.redirect('https://tickquiz.com/');
  return res.redirect(`https://tickquiz.com/verify?reference=${reference}`);
});

// USE ACCESS CODE
app.post('/api/use-access-code', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: 'Access code is required.' });

  const filePath = path.join(__dirname, 'accessCodes.json');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'No access codes found.' });
  }

  let accessCodes = JSON.parse(fs.readFileSync(filePath));
  const codeEntry = accessCodes.find(c => c.code === code);

  if (!codeEntry) {
    return res.status(404).json({ success: false, message: 'Invalid access code.' });
  }

  if (codeEntry.usageCount >= codeEntry.maxUsage) {
    return res.status(403).json({ success: false, message: 'Access code has expired.' });
  }

  codeEntry.usageCount += 1;
  fs.writeFileSync(filePath, JSON.stringify(accessCodes, null, 2));

  return res.status(200).json({ success: true, message: 'Access granted.', usageCount: codeEntry.usageCount });
});

// HOME
app.get('/', (req, res) => {
  res.send('? TickQuiz Backend is running.');
});

app.listen(PORT, () => {
  console.log(`?? Server running on port ${PORT}`);
});