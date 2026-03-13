import { Redis } from '@upstash/redis'
import { Redis as RedisIO } from 'ioredis'

// REST client for Edge/Serverless environments (Upstash)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * ioredis connection for BullMQ.
 * BullMQ requires ioredis as it needs standard Redis protocol (Pub/Sub, Lua scripts).
 * Note: Upstash Redis over ioredis requires a URL like `rediss://...` (TLS).
 */
export const ioredisConnection = new RedisIO(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null,
  tls: process.env.UPSTASH_REDIS_URL?.startsWith('rediss://') ? {} : undefined,
})
