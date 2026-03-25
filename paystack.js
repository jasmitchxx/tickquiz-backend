const axios = require('axios');

async function verifyPaystackPayment(reference) {
  const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    },
  });
  return response.data.data;
}

module.exports = { verifyPaystackPayment };
