import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Global singleton for the database client to prevent 
 * "MaxClientsInSessionMode" errors during Next.js Hot Module Replacement (HMR).
 */

const connectionString = process.env.DATABASE_URL!;

declare global {
  // eslint-disable-next-line no-var
  var postgresClient: postgres.Sql | undefined;
}

// In development, we use a global variable so that the value
// is preserved across module reloads caused by HMR.
let client: postgres.Sql;

if (process.env.NODE_ENV === 'production') {
  client = postgres(connectionString, { prepare: false });
} else {
  if (!global.postgresClient) {
    global.postgresClient = postgres(connectionString, { 
      max: 1, 
      prepare: false,
      idle_timeout: 20, // Close idle connections quickly
      connect_timeout: 10
    });
  }
  client = global.postgresClient;
}

export const db = drizzle(client, { schema });
