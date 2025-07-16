#!/usr/bin/env tsx

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/db/schema';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function syncFromGitHub() {
  console.log('🔄 Starting GitHub to Turso sync...');
  
  // Check required environment variables
  const requiredVars = [
    'DATABASE_URL',
    'DATABASE_AUTH_TOKEN', 
    'GITHUB_TOKEN',
    'GITHUB_OWNER',
    'GITHUB_REPO'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.log('\n📝 Please set these in your .env.local file:');
    console.log('GITHUB_TOKEN=ghp_your_token_here');
    console.log('GITHUB_OWNER=your_github_username');
    console.log('GITHUB_REPO=modern-cms-single-c1');
    process.exit(1);
  }
  
  try {
    // Setup database connection
    const client = createClient({
      url: process.env.DATABASE_URL!,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    
    const db = drizzle(client, { schema });
    console.log('✅ Connected to Turso database');
    
    // Setup GitHub API
    const githubApi = {
      token: process.env.GITHUB_TOKEN!,
      owner: process.env.GITHUB_OWNER!,
      repo: process.env.GITHUB_REPO!,
    };
    
    console.log(`📥 Fetching content from ${githubApi.owner}/${githubApi.repo}...`);
    
    // Get repository contents
    const response = await fetch(
      `https://api.github.com/repos/${githubApi.owner}/${githubApi.repo}/contents`,
      {
        headers: {
          'Authorization': `Bearer ${githubApi.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const contents = await response.json();
    console.log('📁 Repository contents:', contents.map((item: any) => item.name));
    
    // Check for contents and settings directories
    const hasContents = contents.some((item: any) => item.name === 'contents' && item.type === 'dir');
    const hasSettings = contents.some((item: any) => item.name === 'settings' && item.type === 'dir');
    
    console.log(`📄 Contents directory: ${hasContents ? '✅ Found' : '❌ Not found'}`);
    console.log(`⚙️  Settings directory: ${hasSettings ? '✅ Found' : '❌ Not found'}`);
    
    if (!hasContents && !hasSettings) {
      console.log('\n📝 Repository structure should be:');
      console.log('├── contents/');
      console.log('│   ├── index.mdx');
      console.log('│   └── blog/');
      console.log('└── settings/');
      console.log('    ├── navigation.json');
      console.log('    └── site.json');
      console.log('\n🔗 Please create this structure in your repository first.');
      return;
    }
    
    console.log('🎉 GitHub repository accessed successfully!');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Error handling for specific GitHub issues
process.on('unhandledRejection', (reason, promise) => {
  if (typeof reason === 'object' && reason !== null && 'status' in reason) {
    const status = (reason as any).status;
    if (status === 404) {
      console.error('❌ Repository not found. Please check:');
      console.error('   - GITHUB_OWNER is correct');
      console.error('   - GITHUB_REPO exists and is accessible');
      console.error('   - GITHUB_TOKEN has proper permissions');
    } else if (status === 401) {
      console.error('❌ Authentication failed. Please check:');
      console.error('   - GITHUB_TOKEN is valid and not expired');
      console.error('   - Token has "repo" permissions');
    } else {
      console.error(`❌ GitHub API error (${status}):`, reason);
    }
  } else {
    console.error('❌ Unhandled error:', reason);
  }
  process.exit(1);
});

syncFromGitHub().catch(console.error);