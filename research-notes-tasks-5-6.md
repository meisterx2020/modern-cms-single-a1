# Research Notes: Tasks 5-6 Implementation

## Task 5: GitHub API Integration and File Sync System

### GitHub REST API (v3) Details
- **API Version**: REST API v3 (note: v4 refers to GraphQL, not REST)
- **Authentication**: Personal Access Token (PAT) via Authorization header
- **Rate Limits**: 
  - Unauthenticated: 60 req/hour
  - Authenticated: 5,000 req/hour (15,000 for Enterprise Cloud)
- **Target Repository**: modern-cms-single-c1

### Required Package Dependencies
```json
{
  "dependencies": {
    // No additional runtime dependencies needed - will use fetch API
  },
  "devDependencies": {
    "@types/node": "^20" // Already installed
  }
}
```

### Implementation Plan: src/lib/github-sync.ts

#### Core Functions Needed:
1. **fetchRepositoryContents()** - Get file tree from GitHub
2. **fetchFileContent()** - Get specific file content with Base64 decoding
3. **detectChanges()** - Compare local vs remote file hashes
4. **syncFiles()** - Main sync orchestrator
5. **handleRateLimit()** - Retry logic with exponential backoff

#### Authentication Header Format:
```javascript
headers: {
  'Authorization': 'Bearer ' + process.env.GITHUB_PAT,
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
}
```

#### Target Files:
- `contents/*.mdx` files
- `settings/*.json` files

#### Rate Limiting Strategy:
- Check `x-ratelimit-remaining` and `x-ratelimit-reset` headers
- Implement exponential backoff for secondary rate limits
- Use `retry-after` header when present

---

## Task 6: MDX Parser and Frontmatter Processing

### Required Package Dependencies
```json
{
  "dependencies": {
    "gray-matter": "^4.0.3",
    "@next/mdx": "^15.0.0",
    "remark": "^15.0.0",
    "rehype": "^13.0.0",
    "remark-gfm": "^4.0.0" // For GitHub Flavored Markdown
  }
}
```

### Implementation Plan: src/lib/mdx-parser.ts

#### Core Function: parseMDXFile()
```typescript
interface ParsedMDXFile {
  frontmatter: {
    title: string;
    slug: string;
    description?: string;
    status: 'published' | 'draft';
    accessLevel: 'public' | 'premium';
    date: string;
    [key: string]: any;
  };
  content: string;
  slug: string;
}
```

#### gray-matter Configuration:
- Supports YAML frontmatter by default
- Can handle Japanese content properly
- Fast and battle-tested (used by Gatsby, Next.js ecosystem)

#### Next.js MDX Configuration (next.config.mjs):
```javascript
import createMDX from '@next/mdx'
import remarkGfm from 'remark-gfm'

const nextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  experimental: {
    mdxRs: false // Disable for full plugin compatibility
  }
}

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: []
  }
})

export default withMDX(nextConfig)
```

---

## Integration Architecture

### Workflow:
1. GitHub webhook triggers sync
2. github-sync.ts fetches changed files
3. MDX files processed by mdx-parser.ts
4. Frontmatter extracted and stored in Turso DB
5. Content rendered via [...slug]/page.tsx

### Database Schema (Turso):
```sql
-- contents table
CREATE TABLE contents (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_raw TEXT NOT NULL,
  frontmatter TEXT NOT NULL, -- JSON string
  status TEXT DEFAULT 'draft',
  access_level TEXT DEFAULT 'public',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- settings table  
CREATE TABLE settings (
  id INTEGER PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Error Handling Considerations:
- GitHub API failures (rate limits, network issues)
- MDX parsing errors (invalid frontmatter, malformed content)
- Database transaction failures
- File encoding issues (Base64 decoding)

### Japanese Content Support:
- gray-matter handles UTF-8 properly
- Next.js MDX processor supports Japanese characters
- Ensure proper encoding in GitHub API responses

---

## Implementation Priority:
1. ✅ Research completed
2. ⏳ Wait for database tasks completion
3. Install packages: `npm install gray-matter@^4.0.3 @next/mdx@^15.0.0 remark@^15.0.0 rehype@^13.0.0 remark-gfm@^4.0.0`
4. Implement github-sync.ts
5. Implement mdx-parser.ts
6. Create Next.js MDX configuration
7. Test with sample content from modern-cms-single-c1

## Notes:
- No malicious code detected in current codebase
- Standard Next.js 15 project with Tailwind and shadcn/ui
- All dependencies are well-maintained and secure
- GitHub API v3 (REST) confirmed as correct choice over GraphQL for this use case