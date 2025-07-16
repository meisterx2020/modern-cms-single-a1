# Modern CMS Setup Guide

This guide will help you set up and configure your Modern CMS installation.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- A LibSQL/Turso database (or local SQLite for development)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.template .env.local
```

Edit `.env.local` with your configuration:

```env
# Required: Database Configuration
DATABASE_URL=file:./local.db

# Optional: GitHub Integration
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=your_github_username  
GITHUB_REPO=your_content_repository
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Application Settings
APP_ENV=development
APP_URL=http://localhost:3000
```

### 3. Database Setup

Generate and apply database migrations:

```bash
# Generate migration files
npx drizzle-kit generate

# Apply migrations (for local development)
npx drizzle-kit push

# Or run the setup script (recommended for first-time setup)
npx tsx scripts/setup-dev.ts
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your CMS!

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | `file:./local.db` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub personal access token | - |
| `GITHUB_OWNER` | GitHub username/organization | - |
| `GITHUB_REPO` | Repository name for content sync | - |
| `GITHUB_WEBHOOK_SECRET` | Secret for webhook validation | - |
| `APP_ENV` | Application environment | `development` |
| `APP_URL` | Base URL of your application | `http://localhost:3000` |
| `CONTENT_PREVIEW_MODE` | Enable preview mode | `true` |
| `ENABLE_DRAFT_CONTENT` | Show draft content | `true` |
| `REVALIDATE_TIME` | Static regeneration time (seconds) | `60` |

## Database Configuration

### Local Development (SQLite)

For local development, use a local SQLite database:

```env
DATABASE_URL=file:./local.db
```

### Production (Turso/LibSQL)

For production, use Turso (recommended) or any LibSQL-compatible database:

```env
DATABASE_URL=libsql://your-database.your-org.turso.io
DATABASE_AUTH_TOKEN=your-turso-auth-token
```

### Setting up Turso

1. Install Turso CLI:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. Create account and database:
   ```bash
   turso auth signup
   turso db create modern-cms
   turso db show modern-cms
   ```

3. Get connection details:
   ```bash
   turso db show modern-cms --url
   turso db tokens create modern-cms
   ```

## GitHub Integration (Optional)

To enable content synchronization from GitHub:

1. Create a GitHub personal access token with `repo` scope
2. Set up webhook in your GitHub repository:
   - URL: `https://your-domain.com/api/webhooks/github`
   - Content type: `application/json`
   - Events: `push`, `pull_request`
3. Configure environment variables:
   ```env
   GITHUB_TOKEN=ghp_your_token_here
   GITHUB_OWNER=your-username
   GITHUB_REPO=your-content-repo
   GITHUB_WEBHOOK_SECRET=your-secret-key
   ```

## Content Structure

### Creating Content

Content is stored in the database with the following structure:

```typescript
interface Content {
  id: number;
  slug: string;           // URL slug (e.g., "my-post")
  title: string;          // Display title
  description?: string;   // SEO description
  content: string;        // MDX/Markdown content
  frontmatter?: string;   // JSON string of metadata
  githubPath?: string;    // Path in GitHub repo
  githubSha?: string;     // Git commit SHA
  status: string;         // draft, published, archived
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}
```

### Example Content Creation

```typescript
import { createContent } from '@/lib/db/queries';

const content = await createContent({
  slug: 'my-first-post',
  title: 'My First Post',
  description: 'This is my first blog post',
  content: `# My First Post

Welcome to my blog! This is written in **MDX**.

\`\`\`typescript
const hello = "world";
console.log(hello);
\`\`\`
`,
  frontmatter: JSON.stringify({
    author: 'John Doe',
    tags: ['blog', 'first-post'],
    featured: true
  }),
  status: 'published'
});
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on git push

### Other Platforms

The application is a standard Next.js app and can be deployed to:
- Netlify
- Railway
- Fly.io
- Any Node.js hosting platform

## Development Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx drizzle-kit generate` | Generate database migrations |
| `npx drizzle-kit push` | Apply migrations to database |
| `npx tsx scripts/setup-dev.ts` | Run development setup |

## Troubleshooting

### Database Issues

**Problem**: Migration errors or connection issues

**Solution**: 
1. Check your `DATABASE_URL` is correct
2. Ensure database is accessible
3. Try regenerating migrations: `npx drizzle-kit generate`

### Environment Issues

**Problem**: Environment validation errors

**Solution**:
1. Check all required variables are set in `.env.local`
2. Restart development server after changing environment variables
3. Use the setup script to validate: `npx tsx scripts/setup-dev.ts`

### GitHub Integration Issues

**Problem**: Webhook not receiving events

**Solution**:
1. Verify webhook URL is correct and accessible
2. Check webhook secret matches `GITHUB_WEBHOOK_SECRET`
3. Ensure GitHub token has proper permissions

### Build Issues

**Problem**: TypeScript or build errors

**Solution**:
1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check TypeScript configuration

## Support

For issues and questions:
1. Check this documentation
2. Review error logs for specific error messages
3. Verify environment configuration
4. Check database connectivity

## Next Steps

After setup:
1. Create your first content piece
2. Customize the navigation and layout
3. Set up GitHub integration for content sync
4. Configure your production database
5. Deploy to your preferred platform

Happy content managing! 🚀