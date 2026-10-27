import rateLimit from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { getRedisClient } from '../config/redis.js'

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000)

function createStore(prefix) {
  const client = getRedisClient()
  // No REDIS_URL → default memory store inside express-rate-limit
  if (!client) return undefined

  return new RedisStore({
    prefix: `rl:${prefix}:`,
    // ioredis queues commands until connected
    sendCommand: (...args) => client.call(...args),
  })
}

function createLimiter(max, message, prefix) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(prefix),
    // If Redis blips, prefer availability over hard 500s
    passOnStoreError: true,
    message: { success: false, data: null, error: message },
  })
}

// Global fallback for unmatched routes / health
export const globalLimiter = createLimiter(
  Number(process.env.RATE_LIMIT_GLOBAL_MAX || 300),
  'Too many requests. Please try again later.',
  'global',
)

// Strict limiter for login / logout / password endpoints
// Keep above AUTH_LOCKOUT_MAX_ATTEMPTS so lockout messages win over generic rate-limit text
export const authLimiter = createLimiter(
  Number(process.env.RATE_LIMIT_AUTH_MAX || 30),
  'Too many authentication attempts. Please try again later.',
  'auth',
)

// Inventory manager APIs (products, control, suppliers, POs, dashboard, reports)
export const inventoryLimiter = createLimiter(
  Number(process.env.RATE_LIMIT_INVENTORY_MAX || 200),
  'Too many inventory requests. Please try again later.',
  'inventory',
)

// Branch manager APIs
export const branchLimiter = createLimiter(
  Number(process.env.RATE_LIMIT_BRANCH_MAX || 150),
  'Too many branch requests. Please try again later.',
  'branch',
)

// POS sync push/pull — higher throughput for devices
export const syncLimiter = createLimiter(
  Number(process.env.RATE_LIMIT_SYNC_MAX || 400),
  'Too many sync requests. Please try again later.',
  'sync',
)

// B2B Admin APIs
export const adminLimiter = createLimiter(
  Number(process.env.RATE_LIMIT_ADMIN_MAX || 150),
  'Too many admin requests. Please try again later.',
  'admin',
)

// Notifications APIs (was global-only)
export const notificationsLimiter = createLimiter(
  Number(process.env.RATE_LIMIT_NOTIFICATIONS_MAX || 120),
  'Too many notification requests. Please try again later.',
  'notifications',
)
