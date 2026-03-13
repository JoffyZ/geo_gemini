import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * DATABASE_URL should be set in .env
 * For Supabase: postgresql://postgres:[PASSWORD]@db.[PROJECT_ID].supabase.co:5432/postgres
 */
const connectionString = process.env.DATABASE_URL!;

// Use postgres-js for the database driver
const client = postgres(connectionString);

// Initialize Drizzle with the schema for better type safety
export const db = drizzle(client, { schema });
