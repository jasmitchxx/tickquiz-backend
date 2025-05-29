const twilio = require('twilio');
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendAccessCodeSMS(phone, accessCode) {
  return await client.messages.create({
    body: `🎉 Your access code is: ${accessCode}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone,
  });
}

module.exports = { sendAccessCodeSMS };
