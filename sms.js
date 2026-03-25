const twilio = require('twilio');
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendAccessCodeSMS(phone, accessCode) {
  try {
    if (!phone.startsWith('+')) {
      throw new Error('Phone number must be in international format');
    }

    const message = await client.messages.create({
      body: `?? Your TickQuiz access code is: ${accessCode}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    console.log(`? SMS sent to ${phone}: SID ${message.sid}`);
    return message;
  } catch (error) {
    console.error(`? Failed to send SMS to ${phone}:`, error.message);
    throw error;
  }
}

module.exports = { sendAccessCodeSMS };