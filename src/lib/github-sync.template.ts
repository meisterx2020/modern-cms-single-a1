// Template for GitHub API Integration and File Sync System
// Task 5 - Implementation template (DO NOT USE until packages are installed)

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  download_url: string;
  type: 'file' | 'dir';
  content?: string; // Base64 encoded
}

interface GitHubTreeResponse {
  tree: GitHubFile[];
  truncated: boolean;
}

interface SyncResult {
  success: boolean;
  filesProcessed: number;
  errors: string[];
}

interface RateLimitInfo {
  remaining: number;
  reset: number; // Unix timestamp
  limit: number;
}

class GitHubSyncService {
  private readonly baseUrl = 'https://api.github.com';
  private readonly owner: string;
  private readonly repo: string;
  private readonly token: string;

  constructor(owner: string, repo: string, token: string) {
    this.owner = owner;
    this.repo = repo;
    this.token = token;
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ModernCMS-Sync/1.0'
    };
  }

  /**
   * Fetch repository contents with rate limit handling
   */
  async fetchRepositoryContents(path: string = ''): Promise<GitHubFile[]> {
    const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`;
    
    const response = await this.fetchWithRetry(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch contents: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  }

  /**
   * Fetch specific file content and decode from Base64
   */
  async fetchFileContent(path: string): Promise<{ content: string; sha: string }> {
    const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/contents/${path}`;
    
    const response = await this.fetchWithRetry(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file ${path}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.type !== 'file') {
      throw new Error(`${path} is not a file`);
    }

    // Decode Base64 content
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    
    return {
      content,
      sha: data.sha
    };
  }

  /**
   * Get all MDX and JSON files from target directories
   */
  async getTargetFiles(): Promise<GitHubFile[]> {
    const [contentsFiles, settingsFiles] = await Promise.all([
      this.getFilesFromDirectory('contents', '.mdx'),
      this.getFilesFromDirectory('settings', '.json')
    ]);

    return [...contentsFiles, ...settingsFiles];
  }

  /**
   * Get files from specific directory with extension filter
   */
  private async getFilesFromDirectory(directory: string, extension: string): Promise<GitHubFile[]> {
    try {
      const contents = await this.fetchRepositoryContents(directory);
      return contents.filter(file => 
        file.type === 'file' && file.name.endsWith(extension)
      );
    } catch (error) {
      console.warn(`Directory ${directory} not found or inaccessible:`, error);
      return [];
    }
  }

  /**
   * Detect changes by comparing file SHAs
   */
  async detectChanges(localFileShas: Map<string, string>): Promise<GitHubFile[]> {
    const remoteFiles = await this.getTargetFiles();
    
    return remoteFiles.filter(remoteFile => {
      const localSha = localFileShas.get(remoteFile.path);
      return !localSha || localSha !== remoteFile.sha;
    });
  }

  /**
   * Sync files with diff detection
   */
  async syncFiles(localFileShas: Map<string, string>): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      filesProcessed: 0,
      errors: []
    };

    try {
      const changedFiles = await this.detectChanges(localFileShas);
      
      console.log(`Found ${changedFiles.length} changed files to sync`);

      for (const file of changedFiles) {
        try {
          const { content, sha } = await this.fetchFileContent(file.path);
          
          // Process file based on type
          if (file.path.startsWith('contents/') && file.name.endsWith('.mdx')) {
            await this.processMDXFile(file.path, content, sha);
          } else if (file.path.startsWith('settings/') && file.name.endsWith('.json')) {
            await this.processJSONFile(file.path, content, sha);
          }

          result.filesProcessed++;
          console.log(`✓ Synced: ${file.path}`);
          
        } catch (error) {
          const errorMsg = `Failed to sync ${file.path}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

    } catch (error) {
      result.success = false;
      result.errors.push(`Sync failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Process MDX file - to be implemented with mdx-parser
   */
  private async processMDXFile(path: string, content: string, sha: string): Promise<void> {
    // TODO: Implement with mdx-parser.ts
    // 1. Parse frontmatter with gray-matter
    // 2. Extract slug from frontmatter or path
    // 3. Store in Turso contents table
    console.log(`Processing MDX file: ${path} (${content.length} chars)`);
  }

  /**
   * Process JSON settings file
   */
  private async processJSONFile(path: string, content: string, sha: string): Promise<void> {
    // TODO: Implement JSON settings storage
    // 1. Parse JSON content
    // 2. Extract filename as key
    // 3. Store in Turso settings table
    console.log(`Processing JSON file: ${path} (${content.length} chars)`);
  }

  /**
   * Fetch with automatic retry and rate limit handling
   */
  private async fetchWithRetry(url: string, maxRetries: number = 3): Promise<Response> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, { headers: this.headers });

        // Check rate limit headers
        const rateLimitInfo = this.extractRateLimitInfo(response);
        
        if (response.status === 403 && rateLimitInfo.remaining === 0) {
          // Primary rate limit exceeded
          const waitTime = (rateLimitInfo.reset * 1000) - Date.now() + 1000; // +1s buffer
          console.warn(`Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)}s...`);
          await this.sleep(waitTime);
          continue;
        }

        if (response.status === 403 && response.headers.get('retry-after')) {
          // Secondary rate limit
          const retryAfter = parseInt(response.headers.get('retry-after')!) * 1000;
          console.warn(`Secondary rate limit. Waiting ${retryAfter / 1000}s...`);
          await this.sleep(retryAfter);
          continue;
        }

        if (response.status >= 500 && attempt < maxRetries) {
          // Server error - exponential backoff
          const backoffTime = Math.pow(2, attempt) * 1000;
          console.warn(`Server error ${response.status}. Retrying in ${backoffTime / 1000}s...`);
          await this.sleep(backoffTime);
          continue;
        }

        return response;

      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          const backoffTime = Math.pow(2, attempt) * 1000;
          console.warn(`Request failed. Retrying in ${backoffTime / 1000}s...`, error.message);
          await this.sleep(backoffTime);
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimitInfo(response: Response): RateLimitInfo {
    return {
      remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0'),
      reset: parseInt(response.headers.get('x-ratelimit-reset') || '0'),
      limit: parseInt(response.headers.get('x-ratelimit-limit') || '60')
    };
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
  }
}

// Export factory function
export function createGitHubSyncService(
  owner: string = 'your-username', // Update with actual username
  repo: string = 'modern-cms-single-c1',
  token?: string
): GitHubSyncService {
  const githubToken = token || process.env.GITHUB_PAT;
  
  if (!githubToken) {
    throw new Error('GitHub PAT token is required. Set GITHUB_PAT environment variable.');
  }

  return new GitHubSyncService(owner, repo, githubToken);
}

// Export types
export type { GitHubFile, SyncResult, RateLimitInfo };