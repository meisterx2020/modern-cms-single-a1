import matter from 'gray-matter';
import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { getHighlighter, type Highlighter } from 'shiki';

// Frontmatter type definitions
export interface MDXFrontmatter {
  title?: string;
  description?: string;
  date?: string;
  author?: string;
  tags?: string[];
  category?: string;
  status?: 'draft' | 'published' | 'archived';
  accessLevel?: 'public' | 'private' | 'premium';
  featured?: boolean;
  image?: string;
  slug?: string;
  [key: string]: unknown; // Allow custom fields
}

// Parsed MDX content structure
export interface ParsedMDXContent {
  frontmatter: MDXFrontmatter;
  content: string;
  rawContent: string;
  compiledSource?: string;
  wordCount: number;
  readingTime: number; // in minutes
  headings: Array<{
    level: number;
    text: string;
    slug: string;
  }>;
}

// Shiki highlighter instance (singleton)
let highlighter: Highlighter | null = null;

/**
 * Initialize Shiki highlighter
 */
async function getShikiHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await getHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: [
        'javascript',
        'typescript',
        'jsx',
        'tsx',
        'json',
        'css',
        'html',
        'markdown',
        'bash',
        'shell',
        'yaml',
        'toml',
        'sql',
        'python',
        'php',
        'go',
        'rust',
        'java',
        'c',
        'cpp',
        'csharp',
        'ruby',
        'swift',
        'kotlin',
        'dart',
        'vue',
        'svelte',
      ],
    });
  }
  return highlighter;
}

/**
 * Create a rehype plugin for syntax highlighting with Shiki
 */
function createShikiRehypePlugin() {
  return function rehypeShiki() {
    return async (tree: unknown) => {
      const { visit } = await import('unist-util-visit');
      const promises: Promise<void>[] = [];

      visit(tree as any, 'element', (node: any) => {
        if (node.tagName === 'code' && node.properties?.className) {
          const className = node.properties.className;
          const languageMatch = className.find((cls: string) => cls.startsWith('language-'));
          
          if (languageMatch) {
            const language = languageMatch.replace('language-', '');
            const code = node.children[0]?.value || '';
            
            promises.push(
              (async () => {
                try {
                  const shiki = await getShikiHighlighter();
                  const html = shiki.codeToHtml(code, {
                    lang: language,
                    theme: 'github-dark',
                  });
                  
                  // Replace the code element with the highlighted HTML
                  node.type = 'raw';
                  node.value = html;
                  delete node.tagName;
                  delete node.properties;
                  delete node.children;
                } catch (error) {
                  console.warn(`Failed to highlight code block with language "${language}":`, error);
                  // Keep original code block if highlighting fails
                }
              })()
            );
          }
        }
      });

      await Promise.all(promises);
    };
  };
}

/**
 * Extract headings from MDX content
 */
function extractHeadings(content: string): Array<{ level: number; text: string; slug: string }> {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{ level: number; text: string; slug: string }> = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const slug = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    headings.push({ level, text, slug });
  }

  return headings;
}

/**
 * Calculate reading time based on word count
 * Average reading speed: 200 words per minute
 */
function calculateReadingTime(wordCount: number): number {
  const wordsPerMinute = 200;
  const readingTime = Math.ceil(wordCount / wordsPerMinute);
  return Math.max(1, readingTime); // Minimum 1 minute
}

/**
 * Count words in text (supports Japanese text)
 */
function countWords(text: string): number {
  // Remove code blocks and inline code
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/^\s*#{1,6}\s+/gm, '') // Remove markdown headers
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links to just text
    .replace(/[*_~`]/g, '') // Remove markdown formatting
    .trim();

  // For languages like Japanese that don't use spaces
  const japaneseChars = cleanText.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g);
  const japaneseWordCount = japaneseChars ? japaneseChars.length / 2 : 0; // Approximate 2 chars per word

  // Count English words
  const englishWords = cleanText.match(/\b\w+\b/g);
  const englishWordCount = englishWords ? englishWords.length : 0;

  return Math.round(japaneseWordCount + englishWordCount);
}

/**
 * Validate frontmatter data
 */
function validateFrontmatter(data: unknown): MDXFrontmatter {
  const validated: MDXFrontmatter = {};
  
  // Type guard to ensure data is an object
  if (typeof data !== 'object' || data === null) {
    return validated;
  }
  
  const dataObj = data as Record<string, unknown>;

  // Basic string fields
  if (dataObj.title && typeof dataObj.title === 'string') {
    validated.title = dataObj.title;
  }
  if (dataObj.description && typeof dataObj.description === 'string') {
    validated.description = dataObj.description;
  }
  if (dataObj.author && typeof dataObj.author === 'string') {
    validated.author = dataObj.author;
  }
  if (dataObj.category && typeof dataObj.category === 'string') {
    validated.category = dataObj.category;
  }
  if (dataObj.image && typeof dataObj.image === 'string') {
    validated.image = dataObj.image;
  }
  if (dataObj.slug && typeof dataObj.slug === 'string') {
    validated.slug = dataObj.slug;
  }

  // Date field
  if (dataObj.date) {
    const dateStr = typeof dataObj.date === 'string' ? dataObj.date : String(dataObj.date);
    validated.date = dateStr;
  }

  // Array fields
  if (Array.isArray(dataObj.tags)) {
    validated.tags = dataObj.tags.filter((tag): tag is string => typeof tag === 'string');
  }

  // Enum fields
  if (dataObj.status && ['draft', 'published', 'archived'].includes(dataObj.status as string)) {
    validated.status = dataObj.status as 'draft' | 'published' | 'archived';
  }
  if (dataObj.accessLevel && ['public', 'private', 'premium'].includes(dataObj.accessLevel as string)) {
    validated.accessLevel = dataObj.accessLevel as 'public' | 'private' | 'premium';
  }

  // Boolean fields
  if (typeof dataObj.featured === 'boolean') {
    validated.featured = dataObj.featured;
  }

  // Copy other custom fields
  Object.keys(dataObj).forEach(key => {
    if (!(key in validated) && dataObj[key] !== undefined) {
      validated[key] = dataObj[key];
    }
  });

  return validated;
}

/**
 * Parse MDX file content with frontmatter
 */
export async function parseMDXFile(rawContent: string): Promise<ParsedMDXContent> {
  try {
    // Parse frontmatter and content
    const matterResult = matter(rawContent);
    const frontmatter = validateFrontmatter(matterResult.data);
    const content = matterResult.content;

    // Extract headings
    const headings = extractHeadings(content);

    // Calculate reading metrics
    const wordCount = countWords(content);
    const readingTime = calculateReadingTime(wordCount);

    // Compile MDX to JavaScript (optional - for future use)
    let compiledSource: string | undefined;
    try {
      const result = await compile(content, {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap' }],
          createShikiRehypePlugin(),
        ],
        format: 'mdx',
      });
      compiledSource = String(result);
    } catch (error) {
      console.warn('Failed to compile MDX content:', error);
      // Continue without compiled source
    }

    return {
      frontmatter,
      content,
      rawContent,
      compiledSource,
      wordCount,
      readingTime,
      headings,
    };
  } catch (error) {
    console.error('Error parsing MDX file:', error);
    throw new Error('Failed to parse MDX content');
  }
}

/**
 * Parse multiple MDX files
 */
export async function parseMDXFiles(files: Array<{ path: string; content: string }>): Promise<Array<{
  path: string;
  parsed: ParsedMDXContent;
}>> {
  const results = [];
  
  for (const file of files) {
    try {
      const parsed = await parseMDXFile(file.content);
      results.push({ path: file.path, parsed });
    } catch (error) {
      console.error(`Error parsing file ${file.path}:`, error);
      // Continue with other files
    }
  }
  
  return results;
}

/**
 * Generate slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .trim();
}

/**
 * Validate MDX content structure
 */
export function validateMDXContent(content: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const matterResult = matter(content);
    
    // Check if frontmatter exists
    if (!matterResult.data || Object.keys(matterResult.data).length === 0) {
      warnings.push('No frontmatter found');
    }

    // Check required frontmatter fields
    if (!matterResult.data.title) {
      errors.push('Missing required frontmatter field: title');
    }

    // Check content length
    if (matterResult.content.trim().length === 0) {
      errors.push('Content body is empty');
    }

    // Check for basic MDX syntax issues
    const brokenCodeBlocks = (matterResult.content.match(/```/g) || []).length % 2 !== 0;
    if (brokenCodeBlocks) {
      errors.push('Unclosed code block found');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push(`Invalid MDX syntax: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { isValid: false, errors, warnings };
  }
}