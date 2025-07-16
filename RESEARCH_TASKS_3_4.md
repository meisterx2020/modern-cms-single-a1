# Research Report: Tasks 3-4 Implementation Approach

## Overview

This document provides comprehensive research and implementation approach for:
- **Task 3**: Database query functions with Drizzle ORM
- **Task 4**: GitHub Webhook API endpoint with signature verification

## Task 3: Database Query Functions Research

### Drizzle ORM Patterns (2025 Best Practices)

#### Key Features
- **Zero Dependencies**: Lightweight with ~7.4kb bundle size
- **SQL-First Approach**: Direct SQL-like queries with full TypeScript safety
- **Serverless Ready**: Excellent for Edge/Serverless environments
- **Type Inference**: Automatic TypeScript inference from schema definitions

#### Query Patterns

**1. Basic CRUD Operations**
```typescript
// Select with filtering
const content = await db.query.contents.findFirst({
  where: (contents, { eq }) => eq(contents.slug, slug)
});

// Insert with returning
const newContent = await db.insert(contents)
  .values(contentData)
  .returning();

// Update with conditions
const updatedContent = await db.update(contents)
  .set(updates)
  .where(eq(contents.id, id))
  .returning();
```

**2. Relational Queries**
```typescript
// With relationships
const contentWithMeta = await db.query.contents.findFirst({
  where: (contents, { eq }) => eq(contents.slug, slug),
  with: {
    metadata: true,
    tags: true
  }
});
```

**3. Error Handling Best Practices**
- Use custom error classes extending base Error
- Implement centralized error handling middleware
- Type-safe error responses with TypeScript discriminated unions
- Graceful degradation for database connection issues

### Required Functions for Task 3

#### Content Functions
- `getContentBySlug(slug: string)`: Single content retrieval
- `getAllContents()`: List all published content
- `updateContent(id: string, data: Partial<Content>)`: Update existing content
- `createContent(data: NewContent)`: Create new content entry

#### Settings Functions  
- `getSettings(key?: string)`: Retrieve settings (all or specific key)
- `updateSettings(key: string, value: any)`: Update specific setting

#### Error Handling Strategy
- Custom `DatabaseError` class with error codes
- Retry logic for transient database failures
- Proper logging with structured error information
- Type-safe error responses

## Task 4: GitHub Webhook API Research

### Next.js 15 App Router API Routes

#### File Structure
```
src/app/api/webhooks/github/[tenantId]/route.ts
```

#### Route Handler Pattern
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  // Implementation
}
```

### GitHub Webhook Signature Verification

#### Security Requirements
- Use `crypto.timingSafeEqual` for constant-time comparison
- Support both SHA-1 (legacy) and SHA-256 (recommended) signatures
- Verify both signature length and content to prevent timing attacks

#### Implementation Pattern
```typescript
import crypto from 'crypto';

function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = `sha256=${hmac.update(payload, 'utf8').digest('hex')}`;
  
  const sigBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
  
  return sigBuffer.length === expectedBuffer.length && 
         crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}
```

### GitHub Webhook Event Types

#### Push Events
- Triggered on commits to default branch
- Contains commit information and changed files
- Payload includes repository, pusher, and commits array

#### Pull Request Events
- Multiple action types: opened, closed, merged, etc.
- Focus on `merged` action for default branch changes
- Contains PR metadata and merge commit information

#### TypeScript Types
Use `@octokit/webhooks-types` or `github-webhook-event-types` packages for comprehensive type definitions:

```typescript
import { PushEvent, PullRequestEvent } from '@octokit/webhooks-types';

type GitHubWebhookPayload = PushEvent | PullRequestEvent;
```

### Event Processing Strategy

#### Supported Events
1. **Push Events**: Direct commits to default branch
2. **Pull Request Events**: Specifically `merged` action targeting default branch

#### File Processing Logic
1. Filter for relevant file changes (`contents/*.mdx`, `settings/*.json`)
2. Parse MDX files with `gray-matter` for frontmatter extraction
3. Process JSON settings files with appropriate key mapping
4. Batch database updates for efficiency

#### Error Handling
- Validate webhook signatures before processing
- Handle malformed payloads gracefully
- Implement retry logic for database failures
- Log webhook processing for debugging

## Implementation Dependencies

### Required Packages
```json
{
  "dependencies": {
    "drizzle-orm": "^0.31.0",
    "@libsql/client": "^0.6.0",
    "gray-matter": "^4.0.3",
    "@octokit/webhooks-types": "^7.0.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.22.0"
  }
}
```

### Environment Variables
```bash
# Database
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# GitHub Webhook
GITHUB_WEBHOOK_SECRET=

# For development
NODE_ENV=development
```

## Database Schema Requirements

### Contents Table
```sql
CREATE TABLE contents (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_raw TEXT NOT NULL,
  frontmatter TEXT, -- JSON string
  status TEXT DEFAULT 'draft',
  access_level TEXT DEFAULT 'public',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Settings Table
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON string
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Security Considerations

### GitHub Webhook Security
1. **Signature Verification**: Always verify GitHub signatures using constant-time comparison
2. **HTTPS Only**: Ensure webhook endpoints only accept HTTPS requests
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Input Validation**: Validate all incoming payload data

### Database Security
1. **Parameterized Queries**: Drizzle ORM handles this automatically
2. **Connection Security**: Use secure connection strings with proper authentication
3. **Input Sanitization**: Validate and sanitize all user inputs
4. **Error Information**: Avoid exposing sensitive database information in error messages

## Performance Optimization

### Database Queries
1. **Indexes**: Ensure proper indexes on frequently queried columns (slug, status)
2. **Connection Pooling**: Configure appropriate connection pool settings
3. **Query Optimization**: Use selective field retrieval where possible
4. **Caching Strategy**: Consider implementing cache layer for frequently accessed content

### Webhook Processing
1. **Async Processing**: Handle webhook processing asynchronously when possible
2. **Batch Operations**: Group related database operations
3. **Timeout Handling**: Implement appropriate timeouts for external requests
4. **Queue System**: Consider queue-based processing for high-volume webhooks

## Next Steps

1. **Wait for Database Setup**: Do not implement until database schema is established
2. **Environment Configuration**: Ensure all required environment variables are configured
3. **Testing Strategy**: Prepare unit tests for individual functions and integration tests for webhook flow
4. **Error Monitoring**: Set up error tracking and monitoring for production deployment

This research provides a solid foundation for implementing both the database query layer and GitHub webhook processing with modern best practices and security considerations.