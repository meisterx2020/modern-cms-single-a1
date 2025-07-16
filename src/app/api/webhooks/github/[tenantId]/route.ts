import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';

// GitHub webhook event types we're interested in
interface GitHubWebhookPayload {
  action?: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    default_branch: string;
    private: boolean;
    html_url: string;
  };
  ref?: string;
  commits?: Array<{
    id: string;
    message: string;
    added: string[];
    modified: string[];
    removed: string[];
  }>;
  pull_request?: {
    id: number;
    number: number;
    state: string;
    merged: boolean;
    base: {
      ref: string;
    };
    head: {
      ref: string;
    };
  };
}

/**
 * Verify GitHub webhook signature
 * @param payload - Raw payload string
 * @param signature - GitHub signature header (x-hub-signature-256)
 * @param secret - Webhook secret
 * @returns boolean indicating if signature is valid
 */
function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) {
    return false;
  }

  // GitHub sends signature as "sha256=<hash>"
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex')}`;

  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Log webhook event for debugging
 * @param tenantId - Tenant identifier
 * @param event - GitHub event type
 * @param payload - Webhook payload
 */
function logWebhookEvent(tenantId: string, event: string, payload: GitHubWebhookPayload) {
  console.log(`[WEBHOOK] Tenant: ${tenantId}, Event: ${event}`, {
    repository: payload.repository.full_name,
    ref: payload.ref,
    action: payload.action,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Check if the event affects content files
 * @param payload - GitHub webhook payload
 * @returns boolean indicating if content files were affected
 */
function hasContentChanges(payload: GitHubWebhookPayload): boolean {
  if (!payload.commits) {
    return false;
  }

  return payload.commits.some(commit => {
    const allFiles = [...commit.added, ...commit.modified, ...commit.removed];
    return allFiles.some(file => 
      file.startsWith('contents/') && file.endsWith('.mdx') ||
      file.startsWith('settings/') && file.endsWith('.json')
    );
  });
}

/**
 * Process push events
 * @param tenantId - Tenant identifier
 * @param payload - GitHub webhook payload
 */
async function processPushEvent(tenantId: string, payload: GitHubWebhookPayload) {
  // Only process pushes to the default branch
  if (payload.ref !== `refs/heads/${payload.repository.default_branch}`) {
    console.log(`[WEBHOOK] Ignoring push to non-default branch: ${payload.ref}`);
    return;
  }

  // Check if content files were changed
  if (!hasContentChanges(payload)) {
    console.log('[WEBHOOK] No content changes detected, skipping sync');
    return;
  }

  console.log(`[WEBHOOK] Content changes detected for tenant ${tenantId}, triggering sync`);
  
  // TODO: Trigger GitHub sync process
  // This will be implemented in Task 5 (GitHub API sync)
  // For now, just log the intent
  console.log(`[WEBHOOK] Would sync repository: ${payload.repository.full_name}`);
}

/**
 * Process pull request events
 * @param tenantId - Tenant identifier
 * @param payload - GitHub webhook payload
 */
async function processPullRequestEvent(tenantId: string, payload: GitHubWebhookPayload) {
  // Only process merged PRs to the default branch
  if (
    payload.action !== 'closed' ||
    !payload.pull_request?.merged ||
    payload.pull_request.base.ref !== payload.repository.default_branch
  ) {
    console.log('[WEBHOOK] Ignoring non-merged PR or PR not to default branch');
    return;
  }

  console.log(`[WEBHOOK] Merged PR detected for tenant ${tenantId}, triggering sync`);
  
  // TODO: Trigger GitHub sync process
  // This will be implemented in Task 5 (GitHub API sync)
  console.log(`[WEBHOOK] Would sync repository: ${payload.repository.full_name}`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const tenantId = params.tenantId;
    
    // Validate tenant ID (basic validation)
    if (!tenantId || tenantId.length < 3) {
      return NextResponse.json(
        { error: 'Invalid tenant ID' },
        { status: 400 }
      );
    }

    // Get headers
    const headersList = headers();
    const githubEvent = headersList.get('x-github-event');
    const githubSignature = headersList.get('x-hub-signature-256');
    const githubDelivery = headersList.get('x-github-delivery');

    if (!githubEvent) {
      return NextResponse.json(
        { error: 'Missing GitHub event header' },
        { status: 400 }
      );
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[WEBHOOK] GITHUB_WEBHOOK_SECRET environment variable not set');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    // Read and verify payload
    const rawPayload = await request.text();
    
    // Verify GitHub signature
    if (githubSignature && !verifyGitHubSignature(rawPayload, githubSignature, webhookSecret)) {
      console.error('[WEBHOOK] Invalid GitHub signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse payload
    let payload: GitHubWebhookPayload;
    try {
      payload = JSON.parse(rawPayload);
    } catch (error) {
      console.error('[WEBHOOK] Failed to parse payload:', error);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Log the event
    logWebhookEvent(tenantId, githubEvent, payload);

    // Process based on event type
    switch (githubEvent) {
      case 'push':
        await processPushEvent(tenantId, payload);
        break;
      
      case 'pull_request':
        await processPullRequestEvent(tenantId, payload);
        break;
      
      case 'ping':
        console.log(`[WEBHOOK] Ping received for tenant ${tenantId}`);
        break;
      
      default:
        console.log(`[WEBHOOK] Unhandled event type: ${githubEvent}`);
        break;
    }

    // Return success response
    return NextResponse.json({
      message: 'Webhook processed successfully',
      tenantId,
      event: githubEvent,
      delivery: githubDelivery,
    });

  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}