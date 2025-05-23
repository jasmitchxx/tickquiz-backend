// server.js
require('dotenv').config(); // Load environment variables

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const PORT = process.env.PORT || 5000;

const client = twilio(accountSid, authToken);
const app = express();

app.use(cors());
app.use(bodyParser.json());

// Utility: Generate a 6-digit access code
function generateAccessCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Endpoint: Handle access code requests
app.post('/api/request-code', async (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ message: 'Name and phone are required.' });
  }

  const accessCode = generateAccessCode();
  const data = { name, phone, accessCode, timestamp: new Date().toISOString() };
  const filePath = path.join(__dirname, 'requests.json');

  let allRequests = [];
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath);
    allRequests = JSON.parse(fileContent);
  }

  allRequests.push(data);
  fs.writeFileSync(filePath, JSON.stringify(allRequests, null, 2));

  try {
    await client.messages.create({
      body: `Hello ${name}, your access code is: ${accessCode}`,
      from: twilioPhone,
      to: phone
    });

    console.log(`? Access code sent to ${phone}`);
    res.json({ message: 'Access code sent successfully!' });
  } catch (err) {
    console.error('? Error sending SMS:', err.message);
    res.status(500).json({ message: 'Failed to send access code.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`? Server running on port ${PORT}. If hosted on Render, access via your Render URL.`);
});