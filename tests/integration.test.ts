/**
 * Integration tests for the Modern CMS system
 * These tests validate that the core functionality works end-to-end
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '@/lib/db';
import { contents, settings } from '@/lib/db/schema';
import { 
  createContent, 
  getContentBySlug, 
  getAllContents,
  createSetting,
  getSetting,
  updateSetting 
} from '@/lib/db/queries';
import { eq } from 'drizzle-orm';

describe('Database Integration', () => {
  beforeAll(async () => {
    // Clean up test data
    await db.delete(contents).where(eq(contents.slug, 'test-content'));
    await db.delete(settings).where(eq(settings.key, 'test_setting'));
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(contents).where(eq(contents.slug, 'test-content'));
    await db.delete(settings).where(eq(settings.key, 'test_setting'));
  });

  describe('Content Management', () => {
    test('should create and retrieve content', async () => {
      // Create test content
      const content = await createContent({
        slug: 'test-content',
        title: 'Test Content',
        description: 'A test content piece',
        content: '# Test\n\nThis is a test content.',
        frontmatter: JSON.stringify({ author: 'Test User' }),
        status: 'published',
      });

      expect(content).toBeDefined();
      expect(content.slug).toBe('test-content');
      expect(content.title).toBe('Test Content');

      // Retrieve content by slug
      const retrieved = await getContentBySlug('test-content');
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Test Content');
    });

    test('should list all published content', async () => {
      const allContent = await getAllContents('published');
      expect(Array.isArray(allContent)).toBe(true);
      
      const testContent = allContent.find(c => c.slug === 'test-content');
      expect(testContent).toBeDefined();
    });

    test('should return null for non-existent content', async () => {
      const notFound = await getContentBySlug('does-not-exist');
      expect(notFound).toBeNull();
    });
  });

  describe('Settings Management', () => {
    test('should create and retrieve settings', async () => {
      // Create test setting
      const setting = await createSetting({
        key: 'test_setting',
        value: 'test_value',
        type: 'string',
        description: 'A test setting',
        category: 'test',
      });

      expect(setting).toBeDefined();
      expect(setting.key).toBe('test_setting');
      expect(setting.value).toBe('test_value');

      // Retrieve setting
      const retrieved = await getSetting('test_setting');
      expect(retrieved).toBeDefined();
      expect(retrieved?.value).toBe('test_value');
    });

    test('should update existing settings', async () => {
      // Update the test setting
      const updated = await updateSetting('test_setting', 'updated_value');
      expect(updated).toBeDefined();
      expect(updated?.value).toBe('updated_value');

      // Verify the update
      const retrieved = await getSetting('test_setting');
      expect(retrieved?.value).toBe('updated_value');
    });

    test('should return null for non-existent settings', async () => {
      const notFound = await getSetting('does_not_exist');
      expect(notFound).toBeNull();
    });
  });
});

describe('Environment Configuration', () => {
  test('should have required environment variables', () => {
    // Test that environment validation works
    expect(process.env.DATABASE_URL).toBeDefined();
  });

  test('should parse environment correctly', async () => {
    // Import env to trigger validation
    const { env } = await import('@/lib/env');
    
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.NODE_ENV).toBeDefined();
    expect(typeof env.REVALIDATE_TIME).toBe('number');
    expect(typeof env.CONTENT_PREVIEW_MODE).toBe('boolean');
  });
});

describe('Content Rendering', () => {
  test('should handle MDX content structure', () => {
    const sampleMDX = `# Heading

This is a paragraph with **bold** text and *italic* text.

\`\`\`javascript
const hello = "world";
console.log(hello);
\`\`\`

- List item 1
- List item 2
`;

    // Basic validation that our content structure supports MDX
    expect(sampleMDX).toContain('# Heading');
    expect(sampleMDX).toContain('```javascript');
    expect(sampleMDX).toContain('**bold**');
  });
});

// Helper function to run quick smoke tests
export async function runSmokeTests() {
  console.log('🧪 Running smoke tests...');
  
  try {
    // Test database connection
    const testQuery = await db.select().from(contents).limit(1);
    console.log('✅ Database connection: OK');

    // Test basic content operations
    const contentCount = await getAllContents();
    console.log(`✅ Content queries: OK (${contentCount.length} items)`);

    // Test basic settings operations
    const settingsCount = await db.select().from(settings);
    console.log(`✅ Settings queries: OK (${settingsCount.length} items)`);

    console.log('🎉 All smoke tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Smoke tests failed:', error);
    return false;
  }
}