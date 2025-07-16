#!/usr/bin/env tsx

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function fetchDirectoryContents(owner: string, repo: string, path: string, token: string): Promise<any[]> {
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

async function debugGitHubStructure() {
  console.log('🔍 Debugging GitHub repository structure...');
  
  const githubApi = {
    token: process.env.GITHUB_TOKEN!,
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
  };
  
  try {
    // Check root contents directory
    console.log('\n📁 /contents directory:');
    const contentsDir = await fetchDirectoryContents(githubApi.owner, githubApi.repo, 'contents', githubApi.token);
    
    for (const item of contentsDir) {
      console.log(`   ${item.type === 'dir' ? '📁' : '📄'} ${item.name} (${item.type})`);
      
      // If it's a directory, check its contents too
      if (item.type === 'dir') {
        try {
          const subDir = await fetchDirectoryContents(githubApi.owner, githubApi.repo, item.path, githubApi.token);
          for (const subItem of subDir) {
            console.log(`      ${subItem.type === 'dir' ? '📁' : '📄'} ${subItem.name} (${subItem.type})`);
            console.log(`         Path: ${subItem.path}`);
          }
        } catch (error) {
          console.log(`      ❌ Failed to read subdirectory: ${error}`);
        }
      } else {
        console.log(`      Path: ${item.path}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to debug structure:', error);
  }
}

debugGitHubStructure().catch(console.error);