import twilio from 'twilio';
import { config } from '../config/index.js';

let client = null;

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;

  if (!client) {
    client = twilio(accountSid, authToken);
  }
  return client;
}

function normalizeFromNumber(v) {
  if (!v) return v;
  return v.startsWith('+') ? v : `+${v}`;
}

function getFirstName(name) {
  if (!name) return 'User';
  const trimmed = String(name).trim();
  if (!trimmed) return 'User';
  return trimmed.split(/\s+/)[0];
}

/**
 * Sends OTP via SMS using Twilio.
 * - `mobile10` must be a 10-digit string (app stores only digits).
 * - opts.type: 'signup' | 'login'
 * - opts.name: user's display name
 * - Returns true if Twilio call succeeded; false if Twilio not configured or failed.
 */
export async function sendOtpSms(mobile10, otp, opts = {}) {
  const { type = 'login', name } = opts;
  const tw = getTwilioClient();
  const from = normalizeFromNumber(process.env.TWILIO_FROM_NUMBER);
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!tw) {
    // If Twilio isn't configured, keep login working (OTP still shown in dev logs).
    return false;
  }

  if (!from && !messagingServiceSid) {
    return false;
  }

  const to = `+${config.otpSmsCountryCode}${String(mobile10).replace(/\D/g, '').slice(-10)}`;
  const firstName = getFirstName(name);
  const welcomeLine =
    type === 'signup' ? `Welcome to SyncPay, ${firstName}!` : `Welcome back to SyncPay, ${firstName}!`;
  const body = `${welcomeLine} OTP: ${otp}. It is valid for ${Math.round(config.otpExpireSeconds / 60)} minutes.`;

  try {
    if (messagingServiceSid) {
      await tw.messages.create({
        messagingServiceSid,
        to,
        body,
      });
    } else {
      await tw.messages.create({
        from,
        to,
        body,
      });
    }
    return true;
  } catch (err) {
    console.error('Twilio OTP send failed:', err?.message || err);
    return false;
  }
}

