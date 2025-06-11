const express = require('express');
const router = express.Router();
const { verifyPaystackPayment } = require('../services/paystack');
const { sendAccessCodeSMS } = require('../services/sms');
const generateAccessCode = require('../utils/generateAccessCode');
// const saveCodeToDB = require('../services/db'); // <-- Optional if needed

router.post('/verify', async (req, res) => {
  const { reference } = req.body;

  try {
    const payment = await verifyPaystackPayment(reference);

    if (payment.status === 'success') {
      const phone = payment.metadata?.phone || payment.customer?.phone;
      const name = payment.metadata?.name || payment.customer?.name || 'User';

      if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone number not found in metadata' });
      }

      const accessCode = generateAccessCode();

      await sendAccessCodeSMS(phone, accessCode);

      // Optionally store code to DB
      // await saveCodeToDB({ code: accessCode, phone, usageCount: 0, name, createdAt: new Date() });

      console.log(`? Payment verified: Code ${accessCode} sent to ${phone}`);

      return res.status(200).json({
        success: true,
        accessCode,
        phone,
      });
    } else {
      return res.status(400).json({ success: false, message: 'Payment not successful' });
    }
  } catch (err) {
    console.error('Verification error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error during verification' });
  }
});

module.exports = router;