#!/usr/bin/env tsx

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '../src/lib/db/schema';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function setupTurso() {
  console.log('🚀 Setting up Turso database...');
  
  const databaseUrl = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }
  
  if (!authToken) {
    console.error('❌ DATABASE_AUTH_TOKEN not found in environment variables');
    process.exit(1);
  }
  
  console.log('📡 Connecting to Turso database...');
  console.log(`🔗 URL: ${databaseUrl}`);
  
  try {
    // Create client
    const client = createClient({
      url: databaseUrl,
      authToken: authToken,
    });
    
    // Create database instance
    const db = drizzle(client, { schema });
    
    console.log('✅ Connected to Turso successfully!');
    
    // Apply migrations
    console.log('📋 Running migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    
    console.log('✅ Database setup completed!');
    console.log('📊 Tables created: contents, settings');
    
    // Test connection
    const result = await db.select().from(schema.contents).limit(1);
    console.log('🧪 Test query successful');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupTurso().catch(console.error);