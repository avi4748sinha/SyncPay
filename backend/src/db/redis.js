import { createClient } from 'redis';
import { config } from '../config/index.js';

let client = null;
let useMemory = false;

const memoryStore = new Map();

// Dev me Redis bilkul mat chalao – seedha in-memory, taaki login atake na
function skipRedis() {
  return config.nodeEnv === 'development';
}

export async function getRedis() {
  if (skipRedis()) {
    useMemory = true;
    return null;
  }
  if (useMemory) return null;
  if (client) return client;
  try {
    client = createClient({
      url: config.redisUrl,
      socket: { connectTimeout: 5000 },
    });
    client.on('error', () => {});
    await client.connect();
    return client;
  } catch (err) {
    console.warn('Redis not available, using in-memory OTP store.');
    useMemory = true;
    return null;
  }
}

export async function setOTP(mobile, otp) {
  const r = await getRedis();
  const key = `otp:${mobile}`;
  if (r) {
    await r.setEx(key, config.otpExpireSeconds, String(otp));
  } else {
    memoryStore.set(key, String(otp));
    setTimeout(() => memoryStore.delete(key), config.otpExpireSeconds * 1000);
  }
}

export async function getOTP(mobile) {
  const r = await getRedis();
  const key = `otp:${mobile}`;
  if (r) {
    return r.get(key);
  }
  return memoryStore.get(key) || null;
}

export async function deleteOTP(mobile) {
  const r = await getRedis();
  const key = `otp:${mobile}`;
  if (r) {
    await r.del(key);
  } else {
    memoryStore.delete(key);
  }
}
