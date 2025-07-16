#!/usr/bin/env tsx

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/db/schema';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkDatabase() {
  console.log('🔍 Checking Turso database contents...');
  
  try {
    const client = createClient({
      url: process.env.DATABASE_URL!,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    
    const db = drizzle(client, { schema });
    
    // Check contents
    const contents = await db.select().from(schema.contents);
    console.log(`\n📄 Contents (${contents.length}):`);
    contents.forEach(content => {
      console.log(`   📝 /${content.slug}`);
      console.log(`      Title: ${content.title}`);
      console.log(`      Status: ${content.status}`);
      console.log(`      Access: ${content.access_level}`);
      if (content.description) {
        console.log(`      Description: ${content.description}`);
      }
      const frontmatter = JSON.parse(typeof content.frontmatter === 'string' ? content.frontmatter : '{}');
      if (Object.keys(frontmatter).length > 0) {
        console.log(`      Frontmatter:`, Object.keys(frontmatter).join(', '));
      }
      console.log('');
    });
    
    // Check settings
    const settings = await db.select().from(schema.settings);
    console.log(`⚙️  Settings (${settings.length}):`);
    settings.forEach(setting => {
      console.log(`   🔧 ${setting.key}`);
      try {
        const value = JSON.parse(typeof setting.value === 'string' ? setting.value : '{}');
        if (typeof value === 'object' && value !== null) {
          console.log(`      Keys: ${Object.keys(value).join(', ')}`);
        }
      } catch (e) {
        console.log(`      Value: ${setting.value}`);
      }
      console.log('');
    });
    
    console.log('✅ Database check completed!');
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

checkDatabase().catch(console.error);