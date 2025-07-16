#!/usr/bin/env tsx

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import * as schema from '../src/lib/db/schema';
import matter from 'gray-matter';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface GitHubFile {
  name: string;
  path: string;
  content?: string;
  download_url?: string;
  type: 'file' | 'dir';
}

async function fetchGitHubFile(url: string, token: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (data.content) {
    // Base64 decode
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }
  
  throw new Error(`No content found in ${url}`);
}

async function fetchDirectoryContents(owner: string, repo: string, path: string, token: string): Promise<GitHubFile[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch directory ${path}: ${response.status}`);
  }
  
  return await response.json();
}

async function fullSync() {
  console.log('🔄 Starting full GitHub to Turso sync...');
  
  // Check required environment variables
  const requiredVars = ['DATABASE_URL', 'DATABASE_AUTH_TOKEN', 'GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
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
    
    const githubApi = {
      token: process.env.GITHUB_TOKEN!,
      owner: process.env.GITHUB_OWNER!,
      repo: process.env.GITHUB_REPO!,
    };
    
    console.log(`📥 Syncing from ${githubApi.owner}/${githubApi.repo}...`);
    
    // Sync contents directory
    console.log('\n📄 Syncing MDX content files...');
    try {
      const contentsFiles = await fetchDirectoryContents(githubApi.owner, githubApi.repo, 'contents', githubApi.token);
      
      for (const file of contentsFiles) {
        if (file.type === 'file' && file.name.endsWith('.mdx')) {
          console.log(`   📝 Processing: ${file.path}`);
          
          try {
            const content = await fetchGitHubFile(
              `https://api.github.com/repos/${githubApi.owner}/${githubApi.repo}/contents/${file.path}`,
              githubApi.token
            );
            
            // Parse frontmatter
            const { data: frontmatter, content: mdxContent } = matter(content);
            
            // Generate slug from file path
            const slug = file.path.replace('contents/', '').replace('.mdx', '').replace(/\//g, '/');
            
            // Insert or update content
            await db.insert(schema.contents)
              .values({
                slug,
                title: frontmatter.title || file.name.replace('.mdx', ''),
                description: frontmatter.description || '',
                content_raw: mdxContent,
                frontmatter: JSON.stringify(frontmatter),
                status: frontmatter.status || 'published',
                access_level: frontmatter.access_level || 'public',
              })
              .onConflictDoUpdate({
                target: schema.contents.slug,
                set: {
                  title: frontmatter.title || file.name.replace('.mdx', ''),
                  description: frontmatter.description || '',
                  content_raw: mdxContent,
                  frontmatter: JSON.stringify(frontmatter),
                  status: frontmatter.status || 'published',
                  access_level: frontmatter.access_level || 'public',
                  updated_at: new Date().toISOString(),
                }
              });
            
            console.log(`   ✅ Synced: ${slug}`);
            
          } catch (error) {
            console.warn(`   ⚠️  Failed to sync ${file.path}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Failed to sync contents directory:', error);
    }
    
    // Sync settings directory
    console.log('\n⚙️  Syncing JSON settings files...');
    try {
      const settingsFiles = await fetchDirectoryContents(githubApi.owner, githubApi.repo, 'settings', githubApi.token);
      
      for (const file of settingsFiles) {
        if (file.type === 'file' && file.name.endsWith('.json')) {
          console.log(`   🔧 Processing: ${file.path}`);
          
          try {
            const content = await fetchGitHubFile(
              `https://api.github.com/repos/${githubApi.owner}/${githubApi.repo}/contents/${file.path}`,
              githubApi.token
            );
            
            // Parse JSON
            const jsonData = JSON.parse(content);
            const key = file.name.replace('.json', '');
            
            // Insert or update setting
            await db.insert(schema.settings)
              .values({
                key,
                value: JSON.stringify(jsonData),
              })
              .onConflictDoUpdate({
                target: schema.settings.key,
                set: {
                  value: JSON.stringify(jsonData),
                  updated_at: new Date().toISOString(),
                }
              });
            
            console.log(`   ✅ Synced: ${key}`);
            
          } catch (error) {
            console.warn(`   ⚠️  Failed to sync ${file.path}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Failed to sync settings directory:', error);
    }
    
    // Get final counts
    const contentCount = await db.select().from(schema.contents);
    const settingsCount = await db.select().from(schema.settings);
    
    console.log('\n📊 Sync Summary:');
    console.log(`   📄 Content files: ${contentCount.length} total`);
    console.log(`   ⚙️  Settings files: ${settingsCount.length} total`);
    console.log('🎉 Full sync completed successfully!');
    
    // Show synced content
    console.log('\n📋 Synced Content:');
    contentCount.forEach(content => {
      console.log(`   📝 ${content.slug} - "${content.title}"`);
    });
    
    console.log('\n🔧 Synced Settings:');
    settingsCount.forEach(setting => {
      console.log(`   ⚙️  ${setting.key}`);
    });
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

fullSync().catch(console.error);