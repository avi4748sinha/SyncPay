import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  allowLoggedOtp:
    process.env.ALLOW_LOGGED_OTP === 'true' || process.env.NODE_ENV === 'development',
  allowOtpWithoutSms:
    process.env.ALLOW_OTP_WITHOUT_SMS === 'true' || process.env.NODE_ENV === 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/syncpay',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwt: {
    secret: process.env.JWT_SECRET || 'syncpay-jwt-secret-change-me',
    expire: process.env.JWT_EXPIRE || '7d',
  },
  otpExpireSeconds: parseInt(process.env.OTP_EXPIRE_SECONDS || '300', 10),
  // Mobile numbers are stored as 10-digit (without country code) in this app.
  // Default assumes India (+91). Change via OTP_SMS_COUNTRY_CODE if needed.
  otpSmsCountryCode: process.env.OTP_SMS_COUNTRY_CODE || '91',
  defaultOfflineLimit: parseInt(process.env.DEFAULT_OFFLINE_LIMIT || '500000', 10), // ₹5000 in paise
  // Offline payments may sync hours/days later; keep window wide (override via env)
  txnTimestampMaxAgeSeconds: parseInt(process.env.TXN_MAX_AGE_SECONDS || '604800', 10), // default 7 days
};
