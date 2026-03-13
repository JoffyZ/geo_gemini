import { Queue } from 'bullmq'
import { ioredisConnection } from '../redis'

/**
 * BullMQ Monitoring Queue.
 * Used for processing AI monitoring tasks asynchronously.
 */
export const monitoringQueue = new Queue('monitoring-queue', {
  connection: ioredisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'adaptive',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // keep for an hour
      count: 1000,
    },
    removeOnFail: {
      age: 24 * 3600, // keep for a day
    },
  },
})
