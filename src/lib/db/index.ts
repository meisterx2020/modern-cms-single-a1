import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { getDatabaseConfig } from '@/lib/env';
import * as schema from './schema';

// Get validated database configuration
const dbConfig = getDatabaseConfig();

// Create the libSQL client
const client = createClient({
  url: dbConfig.url,
  authToken: dbConfig.authToken,
});

// Create the Drizzle database instance with schema
export const db = drizzle(client, { schema });

// Export the client for direct usage if needed
export { client };

// Export schema for external use
export { schema };

// Export types for external use
export type Database = typeof db;