#!/usr/bin/env tsx
/**
 * Development setup script
 * This script initializes the database with sample data and validates the environment
 */

import { db } from '@/lib/db';
import { contents, settings } from '@/lib/db/schema';
import { createContent, createSetting } from '@/lib/db/queries';
import { env, validateRequiredEnvVars } from '@/lib/env';

async function setupDatabase() {
  console.log('🗄️  Setting up database...');
  
  try {
    // Run migrations
    console.log('Running database migrations...');
    // Note: In a real setup, you'd run `npx drizzle-kit push` here
    
    // Insert sample content
    console.log('Inserting sample content...');
    
    const sampleContent = await createContent({
      slug: 'welcome',
      title: 'Welcome to Modern CMS',
      description: 'Get started with your new content management system',
      content: `# Welcome to Modern CMS

This is your new content management system built with modern web technologies.

## Features

- **Modern Stack**: Built with Next.js 15, TypeScript, and Tailwind CSS
- **Content Management**: MDX support with syntax highlighting
- **Database**: SQLite with Drizzle ORM
- **GitHub Integration**: Sync content from GitHub repositories
- **Responsive Design**: Mobile-first design with dark mode support

## Getting Started

1. Create your first content in the database
2. Set up GitHub integration (optional)
3. Customize the navigation and layout
4. Deploy to your preferred platform

Happy writing! 🚀`,
      frontmatter: JSON.stringify({
        author: 'System',
        tags: ['welcome', 'getting-started'],
        featured: true
      }),
      status: 'published',
    });

    console.log(`✅ Created sample content: ${sampleContent.title}`);

    // Insert sample settings
    console.log('Inserting sample settings...');
    
    const sampleSettings = [
      {
        key: 'site_title',
        value: 'Modern CMS',
        type: 'string',
        description: 'The title of your website',
        category: 'general'
      },
      {
        key: 'site_description',
        value: 'A modern content management system',
        type: 'string',
        description: 'The description of your website',
        category: 'general'
      },
      {
        key: 'navigation_items',
        value: JSON.stringify([
          { label: 'Home', href: '/' },
          { label: 'About', href: '/about' },
          { label: 'Blog', href: '/blog' },
          { label: 'Contact', href: '/contact' }
        ]),
        type: 'json',
        description: 'Navigation menu items',
        category: 'navigation'
      },
      {
        key: 'github_sync_enabled',
        value: 'false',
        type: 'boolean',
        description: 'Enable GitHub content synchronization',
        category: 'github'
      }
    ];

    for (const setting of sampleSettings) {
      const created = await createSetting(setting);
      console.log(`✅ Created setting: ${created.key}`);
    }

    console.log('🎉 Database setup completed successfully!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }
}

async function validateEnvironment() {
  console.log('🔍 Validating environment...');
  
  try {
    // Validate basic required environment variables
    validateRequiredEnvVars(['DATABASE_URL']);
    
    console.log('✅ Environment validation passed');
    console.log(`📍 Database URL: ${env.DATABASE_URL}`);
    console.log(`🌍 Environment: ${env.APP_ENV}`);
    console.log(`🔗 App URL: ${env.APP_URL}`);
    
    if (env.GITHUB_TOKEN) {
      console.log('🐙 GitHub integration available');
    } else {
      console.log('⚠️  GitHub integration not configured (optional)');
    }
    
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    throw error;
  }
}

async function testDatabaseConnection() {
  console.log('🔌 Testing database connection...');
  
  try {
    // Test basic database operations
    const contentCount = await db.select().from(contents);
    const settingsCount = await db.select().from(settings);
    
    console.log(`✅ Database connected successfully`);
    console.log(`📝 Contents in database: ${contentCount.length}`);
    console.log(`⚙️  Settings in database: ${settingsCount.length}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting development setup...\n');
  
  try {
    await validateEnvironment();
    console.log('');
    
    await testDatabaseConnection();
    console.log('');
    
    await setupDatabase();
    console.log('');
    
    console.log('🎉 Development setup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run `npm run dev` to start the development server');
    console.log('2. Visit http://localhost:3000 to see your CMS');
    console.log('3. Visit http://localhost:3000/welcome to see sample content');
    console.log('');
  } catch (error) {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}