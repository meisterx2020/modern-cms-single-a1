#!/usr/bin/env tsx

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/db/schema';
import matter from 'gray-matter';
import dotenv from 'dotenv';

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

async function getAllMDXFiles(owner: string, repo: string, path: string, token: string): Promise<GitHubFile[]> {
  const allFiles: GitHubFile[] = [];
  
  const items = await fetchDirectoryContents(owner, repo, path, token);
  
  for (const item of items) {
    if (item.type === 'file' && item.name.endsWith('.mdx')) {
      allFiles.push(item);
    } else if (item.type === 'dir') {
      // Recursively get files from subdirectories
      const subFiles = await getAllMDXFiles(owner, repo, item.path, token);
      allFiles.push(...subFiles);
    }
  }
  
  return allFiles;
}

async function recursiveSync() {
  console.log('🔄 Starting recursive GitHub to Turso sync...');
  
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
    
    // Get all MDX files recursively
    console.log('\n📄 Finding all MDX files recursively...');
    const allMDXFiles = await getAllMDXFiles(githubApi.owner, githubApi.repo, 'contents', githubApi.token);
    
    console.log(`Found ${allMDXFiles.length} MDX files:`);
    allMDXFiles.forEach(file => {
      console.log(`   📝 ${file.path}`);
    });
    
    console.log('\n🔄 Processing MDX files...');
    let syncedCount = 0;
    let errorCount = 0;
    
    for (const file of allMDXFiles) {
      console.log(`\n📝 Processing: ${file.path}`);
      
      try {
        const content = await fetchGitHubFile(
          `https://api.github.com/repos/${githubApi.owner}/${githubApi.repo}/contents/${file.path}`,
          githubApi.token
        );
        
        // Parse frontmatter
        const { data: frontmatter, content: mdxContent } = matter(content);
        
        // Generate slug from file path
        let slug = file.path.replace('contents/', '').replace('.mdx', '');
        
        // Handle index files (e.g., about/index.mdx -> about)
        if (slug.endsWith('/index')) {
          slug = slug.replace('/index', '');
        }
        
        // If slug is empty (for root index), use 'index'
        if (slug === '') {
          slug = 'index';
        }
        
        console.log(`   🎯 Slug: /${slug}`);
        console.log(`   📋 Title: ${frontmatter.title || 'No title'}`);
        
        // Insert or update content
        await db.insert(schema.contents)
          .values({
            slug,
            title: frontmatter.title || file.name.replace('.mdx', ''),
            description: frontmatter.description || '',
            content_raw: mdxContent,
            frontmatter: JSON.stringify(frontmatter),
            status: frontmatter.status || 'published',
            access_level: frontmatter.accessLevel || frontmatter.access_level || 'public',
          })
          .onConflictDoUpdate({
            target: schema.contents.slug,
            set: {
              title: frontmatter.title || file.name.replace('.mdx', ''),
              description: frontmatter.description || '',
              content_raw: mdxContent,
              frontmatter: JSON.stringify(frontmatter),
              status: frontmatter.status || 'published',
              access_level: frontmatter.accessLevel || frontmatter.access_level || 'public',
              updated_at: new Date().toISOString(),
            }
          });
        
        console.log(`   ✅ Synced successfully!`);
        syncedCount++;
        
      } catch (error) {
        console.error(`   ❌ Failed to sync: ${error}`);
        errorCount++;
      }
    }
    
    // Sync settings directory (same as before)
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
            
            const jsonData = JSON.parse(content);
            const key = file.name.replace('.json', '');
            
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
    
    console.log('\n📊 Recursive Sync Summary:');
    console.log(`   📄 MDX files processed: ${allMDXFiles.length}`);
    console.log(`   ✅ Successfully synced: ${syncedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📄 Total content records: ${contentCount.length}`);
    console.log(`   ⚙️  Total settings records: ${settingsCount.length}`);
    
    // Show all synced content
    console.log('\n📋 All Synced Content:');
    contentCount.forEach(content => {
      console.log(`   📝 /${content.slug} - "${content.title}" (${content.status})`);
    });
    
    console.log('\n🎉 Recursive sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

recursiveSync().catch(console.error);