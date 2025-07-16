// GitHub API integration for syncing MDX files and settings
import { createContent, updateContent, getContentBySlug, updateSetting } from './db/queries';

// GitHub API types
interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file';
  content?: string;
  encoding?: string;
}

interface GitHubDirectory {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'dir';
}

type GitHubContentItem = GitHubFile | GitHubDirectory;

interface GitHubApiResponse {
  message?: string;
  documentation_url?: string;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

interface GitHubRateLimitResponse {
  rate: RateLimitInfo;
  resources: {
    core: RateLimitInfo;
    search: RateLimitInfo;
    graphql: RateLimitInfo;
  };
}

// GitHub sync configuration
interface GitHubSyncConfig {
  owner: string;
  repo: string;
  branch?: string;
  pat: string;
}

export class GitHubSyncService {
  private config: GitHubSyncConfig;
  private baseUrl = 'https://api.github.com';

  constructor(config: GitHubSyncConfig) {
    this.config = {
      ...config,
      branch: config.branch || 'main',
    };
  }

  /**
   * Make authenticated request to GitHub API
   */
  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.config.pat}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Modern-CMS-Single/1.0',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as GitHubApiResponse;
      throw new Error(
        `GitHub API error (${response.status}): ${errorData.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Check rate limit status
   */
  async checkRateLimit(): Promise<GitHubRateLimitResponse> {
    return this.makeRequest<GitHubRateLimitResponse>('/rate_limit');
  }

  /**
   * Get repository contents from a specific path
   */
  async getRepositoryContents(path: string = ''): Promise<GitHubContentItem[]> {
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
    
    if (this.config.branch !== 'main') {
      return this.makeRequest<GitHubContentItem[]>(`${endpoint}?ref=${this.config.branch}`);
    }
    
    return this.makeRequest<GitHubContentItem[]>(endpoint);
  }

  /**
   * Get file content with Base64 decoding
   */
  async getFileContent(path: string): Promise<string> {
    const endpoint = `/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
    
    const params = this.config.branch !== 'main' ? `?ref=${this.config.branch}` : '';
    const file = await this.makeRequest<GitHubFile>(`${endpoint}${params}`);

    if (!file.content) {
      throw new Error(`File content not available for: ${path}`);
    }

    // Decode Base64 content
    const content = Buffer.from(file.content, 'base64').toString('utf-8');
    return content;
  }

  /**
   * Get all MDX files from the contents directory
   */
  async getMDXFiles(): Promise<Array<{ path: string; content: string; sha: string }>> {
    try {
      const contentsDir = await this.getRepositoryContents('contents');
      const mdxFiles = contentsDir.filter(
        (item): item is GitHubFile => 
          item.type === 'file' && item.name.endsWith('.mdx')
      );

      const results = [];
      
      for (const file of mdxFiles) {
        try {
          const content = await this.getFileContent(file.path);
          results.push({
            path: file.path,
            content,
            sha: file.sha,
          });
        } catch (error) {
          console.error(`Error fetching MDX file ${file.path}:`, error);
          // Continue with other files even if one fails
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching MDX files:', error);
      throw new Error('Failed to fetch MDX files from GitHub');
    }
  }

  /**
   * Get all JSON settings files
   */
  async getSettingsFiles(): Promise<Array<{ path: string; content: any; sha: string }>> {
    try {
      const settingsDir = await this.getRepositoryContents('settings');
      const jsonFiles = settingsDir.filter(
        (item): item is GitHubFile => 
          item.type === 'file' && item.name.endsWith('.json')
      );

      const results = [];
      
      for (const file of jsonFiles) {
        try {
          const content = await this.getFileContent(file.path);
          const parsed = JSON.parse(content);
          results.push({
            path: file.path,
            content: parsed,
            sha: file.sha,
          });
        } catch (error) {
          console.error(`Error fetching settings file ${file.path}:`, error);
          // Continue with other files even if one fails
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching settings files:', error);
      throw new Error('Failed to fetch settings files from GitHub');
    }
  }

  /**
   * Sync MDX files to database
   */
  async syncMDXFilesToDatabase(): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;

    try {
      const mdxFiles = await this.getMDXFiles();
      
      for (const file of mdxFiles) {
        try {
          // Extract slug from filename (remove .mdx extension)
          const slug = file.path.replace('contents/', '').replace('.mdx', '');
          
          // Check if content already exists
          const existingContent = await getContentBySlug(slug);
          
          if (existingContent) {
            // Update existing content
            await updateContent(existingContent.id, {
              content_raw: file.content,
              updated_at: new Date().toISOString(),
            });
            console.log(`Updated content: ${slug}`);
          } else {
            // Create new content (basic implementation)
            // Note: frontmatter parsing will be handled in Task 6
            await createContent({
              slug,
              title: slug.charAt(0).toUpperCase() + slug.slice(1), // Basic title from slug
              content_raw: file.content,
              status: 'published',
              access_level: 'public',
            });
            console.log(`Created content: ${slug}`);
          }
          
          success++;
        } catch (error) {
          console.error(`Error syncing file ${file.path}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('Error in MDX sync process:', error);
      errors++;
    }

    return { success, errors };
  }

  /**
   * Sync settings files to database
   */
  async syncSettingsToDatabase(): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;

    try {
      const settingsFiles = await this.getSettingsFiles();
      
      for (const file of settingsFiles) {
        try {
          // Extract setting key from filename (remove .json extension)
          const key = file.path.replace('settings/', '').replace('.json', '');
          
          // Update or create setting
          await updateSetting(key, file.content);
          console.log(`Updated setting: ${key}`);
          success++;
        } catch (error) {
          console.error(`Error syncing settings file ${file.path}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('Error in settings sync process:', error);
      errors++;
    }

    return { success, errors };
  }

  /**
   * Full sync process - sync both MDX and settings
   */
  async syncAll(): Promise<{ 
    mdx: { success: number; errors: number }; 
    settings: { success: number; errors: number };
    rateLimit?: GitHubRateLimitResponse;
  }> {
    try {
      // Check rate limit before starting
      const rateLimit = await this.checkRateLimit();
      
      if (rateLimit.rate.remaining < 10) {
        throw new Error(
          `GitHub API rate limit too low (${rateLimit.rate.remaining} remaining). ` +
          `Resets at ${new Date(rateLimit.rate.reset * 1000).toISOString()}`
        );
      }

      console.log(`Starting GitHub sync for ${this.config.owner}/${this.config.repo}`);
      
      // Sync MDX files
      const mdxResult = await this.syncMDXFilesToDatabase();
      
      // Sync settings
      const settingsResult = await this.syncSettingsToDatabase();
      
      console.log('GitHub sync completed:', { mdx: mdxResult, settings: settingsResult });
      
      return {
        mdx: mdxResult,
        settings: settingsResult,
        rateLimit,
      };
    } catch (error) {
      console.error('Error in full sync process:', error);
      throw error;
    }
  }
}

/**
 * Create GitHub sync service instance from environment variables
 */
export function createGitHubSyncService(): GitHubSyncService {
  const pat = process.env.GITHUB_PAT;
  const owner = process.env.GITHUB_OWNER || 'meistudioli';
  const repo = process.env.GITHUB_REPO || 'modern-cms-single-c1';
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!pat) {
    throw new Error('GITHUB_PAT environment variable is required');
  }

  return new GitHubSyncService({
    owner,
    repo,
    branch,
    pat,
  });
}

/**
 * Utility function to trigger sync (to be called from webhook)
 */
export async function triggerGitHubSync(): Promise<boolean> {
  try {
    const syncService = createGitHubSyncService();
    const result = await syncService.syncAll();
    
    // Log results
    console.log('Sync completed successfully:', result);
    
    // Consider it successful if at least one item was synced
    return result.mdx.success > 0 || result.settings.success > 0;
  } catch (error) {
    console.error('GitHub sync failed:', error);
    return false;
  }
}