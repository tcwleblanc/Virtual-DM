import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is missing inside your .env file!');
}

// Establish the serverless database connection
const sqlConnection = neon(process.env.DATABASE_URL);

// Export the type-safe Drizzle client instance
export const db = drizzle(sqlConnection, { schema });