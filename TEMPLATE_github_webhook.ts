// Template: GitHub Webhook API Route - src/app/api/webhooks/github/[tenantId]/route.ts
// DO NOT IMPLEMENT UNTIL DATABASE SETUP IS COMPLETE

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import matter from 'gray-matter';
import type { PushEvent, PullRequestEvent } from '@octokit/webhooks-types';

// Import database functions (will be available after Task 3)
import { 
  createContent, 
  updateContent, 
  getContentBySlug,
  updateSettings,
  withTransaction,
  batchUpdateContents,
  batchCreateContents,
  DatabaseError,
  type NewContent,
  type ContentUpdate
} from '@/lib/db/queries';

// GitHub webhook event types
type GitHubWebhookEvent = PushEvent | PullRequestEvent;

interface WebhookHeaders {
  'x-github-event': string;
  'x-github-delivery': string;
  'x-hub-signature': string;
  'x-hub-signature-256': string;
  'user-agent': string;
}

// Custom error classes
class WebhookError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = 'WebhookError';
  }
}

class SignatureVerificationError extends WebhookError {
  constructor() {
    super('Invalid signature', 401, 'INVALID_SIGNATURE');
  }
}

// GitHub signature verification using crypto.timingSafeEqual
function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    if (!signature || !secret) {
      return false;
    }

    // Support both SHA-1 (legacy) and SHA-256 signatures
    let algorithm: string;
    let expectedSignature: string;

    if (signature.startsWith('sha256=')) {
      algorithm = 'sha256';
      const hmac = crypto.createHmac('sha256', secret);
      expectedSignature = `sha256=${hmac.update(payload, 'utf8').digest('hex')}`;
    } else if (signature.startsWith('sha1=')) {
      algorithm = 'sha1';
      const hmac = crypto.createHmac('sha1', secret);
      expectedSignature = `sha1=${hmac.update(payload, 'utf8').digest('hex')}`;
    } else {
      return false;
    }

    // Convert to buffers for constant-time comparison
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    // Verify length first to prevent timing attacks
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    // Use crypto.timingSafeEqual for constant-time comparison
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Extract webhook headers with proper typing
function extractWebhookHeaders(request: NextRequest): WebhookHeaders {
  return {
    'x-github-event': request.headers.get('x-github-event') || '',
    'x-github-delivery': request.headers.get('x-github-delivery') || '',
    'x-hub-signature': request.headers.get('x-hub-signature') || '',
    'x-hub-signature-256': request.headers.get('x-hub-signature-256') || '',
    'user-agent': request.headers.get('user-agent') || ''
  };
}

// Check if the event should be processed (push to default branch or merged PR)
function shouldProcessEvent(
  event: GitHubWebhookEvent,
  eventType: string
): boolean {
  if (eventType === 'push') {
    const pushEvent = event as PushEvent;
    // Only process pushes to the default branch
    const defaultBranch = pushEvent.repository.default_branch;
    const pushedBranch = pushEvent.ref.replace('refs/heads/', '');
    return pushedBranch === defaultBranch;
  }

  if (eventType === 'pull_request') {
    const prEvent = event as PullRequestEvent;
    // Only process merged PRs to the default branch
    return (
      prEvent.action === 'closed' &&
      prEvent.pull_request.merged === true &&
      prEvent.pull_request.base.ref === prEvent.repository.default_branch
    );
  }

  return false;
}

// Extract changed files from the webhook payload
function extractChangedFiles(event: GitHubWebhookEvent, eventType: string): string[] {
  const changedFiles: string[] = [];

  if (eventType === 'push') {
    const pushEvent = event as PushEvent;
    // Collect all changed files from commits
    for (const commit of pushEvent.commits) {
      changedFiles.push(
        ...commit.added,
        ...commit.modified,
        ...commit.removed
      );
    }
  }

  if (eventType === 'pull_request') {
    const prEvent = event as PullRequestEvent;
    // For PR events, we'd need to fetch changed files via GitHub API
    // For now, we'll process all relevant files (this could be optimized)
    // In a real implementation, you'd want to call GitHub API to get the file list
  }

  return [...new Set(changedFiles)]; // Remove duplicates
}

// Filter files that we care about (MDX content and JSON settings)
function filterRelevantFiles(files: string[]): {
  contentFiles: string[];
  settingFiles: string[];
} {
  const contentFiles = files.filter(file => 
    file.startsWith('contents/') && file.endsWith('.mdx')
  );
  
  const settingFiles = files.filter(file => 
    file.startsWith('settings/') && file.endsWith('.json')
  );

  return { contentFiles, settingFiles };
}

// Fetch file content from GitHub (you'll need to implement this)
async function fetchFileFromGitHub(
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string | null> {
  try {
    // This would use GitHub API to fetch file content
    // For now, return null as placeholder
    // You'll need to implement this with Octokit or fetch API
    
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
    
    // Note: You'll need a GitHub token for private repos
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        // 'Authorization': `token ${process.env.GITHUB_TOKEN}` // if needed
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // File was deleted
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.type !== 'file') {
      throw new Error('Path does not point to a file');
    }

    // Decode base64 content
    return Buffer.from(data.content, 'base64').toString('utf8');
  } catch (error) {
    console.error(`Failed to fetch file ${path}:`, error);
    return null;
  }
}

// Process MDX content files
async function processContentFiles(
  contentFiles: string[],
  owner: string,
  repo: string,
  ref: string
): Promise<void> {
  const contentUpdates: Array<{ slug: string; data: ContentUpdate }> = [];
  const newContents: NewContent[] = [];

  for (const filePath of contentFiles) {
    try {
      const fileContent = await fetchFileFromGitHub(owner, repo, filePath, ref);
      
      if (fileContent === null) {
        // File was deleted - you might want to handle this
        console.log(`File deleted: ${filePath}`);
        continue;
      }

      // Parse MDX with gray-matter
      const { data: frontmatter, content } = matter(fileContent);
      
      // Extract slug from file path or frontmatter
      const slug = frontmatter.slug || filePath
        .replace('contents/', '')
        .replace('.mdx', '')
        .replace(/\/index$/, ''); // Handle index.mdx files

      // Check if content already exists
      const existingContent = await getContentBySlug(slug);

      const contentData = {
        title: frontmatter.title || 'Untitled',
        description: frontmatter.description || null,
        content_raw: content,
        frontmatter: JSON.stringify(frontmatter),
        status: (frontmatter.status as 'draft' | 'published' | 'archived') || 'published',
        access_level: (frontmatter.accessLevel as 'public' | 'private' | 'premium') || 'public'
      };

      if (existingContent) {
        // Update existing content
        contentUpdates.push({
          slug,
          data: contentData
        });
      } else {
        // Create new content
        newContents.push({
          slug,
          ...contentData
        });
      }
    } catch (error) {
      console.error(`Failed to process content file ${filePath}:`, error);
      // Continue processing other files
    }
  }

  // Batch update/create operations
  if (contentUpdates.length > 0) {
    await batchUpdateContents(contentUpdates);
  }

  if (newContents.length > 0) {
    await batchCreateContents(newContents);
  }
}

// Process JSON settings files
async function processSettingsFiles(
  settingFiles: string[],
  owner: string,
  repo: string,
  ref: string
): Promise<void> {
  for (const filePath of settingFiles) {
    try {
      const fileContent = await fetchFileFromGitHub(owner, repo, filePath, ref);
      
      if (fileContent === null) {
        // File was deleted - you might want to handle this
        console.log(`Settings file deleted: ${filePath}`);
        continue;
      }

      // Parse JSON content
      const settingsData = JSON.parse(fileContent);
      
      // Extract key from filename (e.g., "settings/site.json" -> "site")
      const key = filePath
        .replace('settings/', '')
        .replace('.json', '');

      // Update settings in database
      await updateSettings(key, settingsData);
    } catch (error) {
      console.error(`Failed to process settings file ${filePath}:`, error);
      // Continue processing other files
    }
  }
}

// Main webhook handler
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
): Promise<NextResponse> {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new WebhookError('Webhook secret not configured', 500, 'MISSING_SECRET');
    }

    // Extract headers
    const headers = extractWebhookHeaders(request);
    const eventType = headers['x-github-event'];
    const delivery = headers['x-github-delivery'];

    console.log(`Received GitHub webhook: ${eventType} (${delivery})`);

    // Get request body
    const body = await request.text();
    
    // Verify signature
    const signature = headers['x-hub-signature-256'] || headers['x-hub-signature'];
    if (!verifyGitHubSignature(body, signature, webhookSecret)) {
      throw new SignatureVerificationError();
    }

    // Parse webhook payload
    let payload: GitHubWebhookEvent;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      throw new WebhookError('Invalid JSON payload', 400, 'INVALID_JSON');
    }

    // Check if we should process this event
    if (!shouldProcessEvent(payload, eventType)) {
      return NextResponse.json({ 
        message: 'Event ignored (not default branch or not merged PR)' 
      });
    }

    // Extract repository information
    const { owner, name: repo } = payload.repository;
    const ref = eventType === 'push' 
      ? (payload as PushEvent).after 
      : (payload as PullRequestEvent).pull_request.merge_commit_sha;

    if (!ref) {
      throw new WebhookError('Could not determine commit ref', 400, 'MISSING_REF');
    }

    // Get changed files
    const changedFiles = extractChangedFiles(payload, eventType);
    const { contentFiles, settingFiles } = filterRelevantFiles(changedFiles);

    console.log(`Processing ${contentFiles.length} content files and ${settingFiles.length} setting files`);

    // Process files in a transaction
    await withTransaction(async () => {
      // Process content files
      if (contentFiles.length > 0) {
        await processContentFiles(contentFiles, owner.login, repo, ref);
      }

      // Process settings files
      if (settingFiles.length > 0) {
        await processSettingsFiles(settingFiles, owner.login, repo, ref);
      }
    });

    return NextResponse.json({
      message: 'Webhook processed successfully',
      processed: {
        contentFiles: contentFiles.length,
        settingFiles: settingFiles.length
      }
    });

  } catch (error) {
    console.error('Webhook processing error:', error);

    if (error instanceof WebhookError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    if (error instanceof DatabaseError) {
      return NextResponse.json(
        { error: 'Database operation failed', code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
): Promise<NextResponse> {
  return NextResponse.json({
    message: 'GitHub webhook endpoint is active',
    tenantId: params.tenantId,
    timestamp: new Date().toISOString()
  });
}

// Only allow POST and GET methods
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 405,
    headers: {
      'Allow': 'POST, GET',
    },
  });
}