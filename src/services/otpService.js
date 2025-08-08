const config = require('../config/env');
const { upsertOtp } = require('../models/otpModel');

let twilioClient = null;
if (config.twilio.sid && config.twilio.token) {
  twilioClient = require('twilio')(config.twilio.sid, config.twilio.token);
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtp(phone) {
  const code = generateOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  await upsertOtp(phone, code, expiresAt);

  if (twilioClient && config.twilio.from) {
    try {
      await twilioClient.messages.create({ from: config.twilio.from, to: phone, body: `Votre code de vérification: ${code}` });
      return { channel: 'sms' };
    } catch (e) {
      return { channel: 'dev', devOtp: code };
    }
  }
  return { channel: 'dev', devOtp: code };
}

module.exports = { sendOtp };