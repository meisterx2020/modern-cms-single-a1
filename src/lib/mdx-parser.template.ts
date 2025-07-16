// Template for MDX Parser and Frontmatter Processing System
// Task 6 - Implementation template (DO NOT USE until packages are installed)
// Requires: npm install gray-matter@^4.0.3 @next/mdx@^15.0.0 remark@^15.0.0 rehype@^13.0.0 remark-gfm@^4.0.0

import matter from 'gray-matter';

interface MDXFrontmatter {
  title: string;
  slug: string;
  description?: string;
  status: 'published' | 'draft';
  accessLevel: 'public' | 'premium';
  date: string;
  author?: string;
  tags?: string[];
  [key: string]: any;
}

interface ParsedMDXFile {
  frontmatter: MDXFrontmatter;
  content: string;
  slug: string;
  wordCount: number;
  readingTime: number; // estimated minutes
}

interface MDXParsingOptions {
  validateFrontmatter?: boolean;
  generateSlugFromPath?: boolean;
  estimateReadingTime?: boolean;
}

class MDXParserService {
  private readonly defaultOptions: MDXParsingOptions = {
    validateFrontmatter: true,
    generateSlugFromPath: true,
    estimateReadingTime: true
  };

  /**
   * Parse MDX file content and extract frontmatter
   */
  parseMDXFile(
    content: string, 
    filePath?: string, 
    options: MDXParsingOptions = {}
  ): ParsedMDXFile {
    const opts = { ...this.defaultOptions, ...options };

    try {
      // Parse frontmatter using gray-matter
      const { data: frontmatter, content: markdownContent } = matter(content);

      // Validate required frontmatter fields
      if (opts.validateFrontmatter) {
        this.validateFrontmatter(frontmatter);
      }

      // Generate slug if not provided
      let slug = frontmatter.slug;
      if (!slug && opts.generateSlugFromPath && filePath) {
        slug = this.generateSlugFromPath(filePath);
      }

      // Calculate content metrics
      const wordCount = this.calculateWordCount(markdownContent);
      const readingTime = opts.estimateReadingTime 
        ? this.estimateReadingTime(wordCount)
        : 0;

      return {
        frontmatter: {
          ...frontmatter,
          slug,
          status: frontmatter.status || 'draft',
          accessLevel: frontmatter.accessLevel || 'public'
        } as MDXFrontmatter,
        content: markdownContent,
        slug,
        wordCount,
        readingTime
      };

    } catch (error) {
      throw new Error(`Failed to parse MDX file: ${error.message}`);
    }
  }

  /**
   * Parse multiple MDX files
   */
  async parseMDXFiles(
    files: Array<{ content: string; path: string }>,
    options: MDXParsingOptions = {}
  ): Promise<ParsedMDXFile[]> {
    const results: ParsedMDXFile[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const parsed = this.parseMDXFile(file.content, file.path, options);
        results.push(parsed);
      } catch (error) {
        errors.push(`Error parsing ${file.path}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      console.warn('MDX parsing errors:', errors);
    }

    return results;
  }

  /**
   * Validate frontmatter has required fields
   */
  private validateFrontmatter(frontmatter: any): void {
    const requiredFields = ['title'];
    const recommendedFields = ['description', 'date'];

    // Check required fields
    for (const field of requiredFields) {
      if (!frontmatter[field]) {
        throw new Error(`Missing required frontmatter field: ${field}`);
      }
    }

    // Warn about missing recommended fields
    for (const field of recommendedFields) {
      if (!frontmatter[field]) {
        console.warn(`Missing recommended frontmatter field: ${field}`);
      }
    }

    // Validate status if provided
    if (frontmatter.status && !['published', 'draft'].includes(frontmatter.status)) {
      throw new Error(`Invalid status: ${frontmatter.status}. Must be 'published' or 'draft'`);
    }

    // Validate accessLevel if provided
    if (frontmatter.accessLevel && !['public', 'premium'].includes(frontmatter.accessLevel)) {
      throw new Error(`Invalid accessLevel: ${frontmatter.accessLevel}. Must be 'public' or 'premium'`);
    }

    // Validate date format if provided
    if (frontmatter.date && !this.isValidDate(frontmatter.date)) {
      throw new Error(`Invalid date format: ${frontmatter.date}. Use YYYY-MM-DD format`);
    }
  }

  /**
   * Generate slug from file path
   */
  private generateSlugFromPath(filePath: string): string {
    // Remove file extension and convert to slug
    const pathWithoutExt = filePath.replace(/\.mdx?$/, '');
    
    // Handle contents/ directory structure
    const cleanPath = pathWithoutExt.replace(/^contents\//, '');
    
    // Convert to URL-friendly slug
    return '/' + cleanPath
      .split('/')
      .map(segment => this.slugify(segment))
      .join('/');
  }

  /**
   * Convert string to URL-friendly slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      // Replace spaces and special chars with hyphens
      .replace(/[\s\W-]+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Calculate word count from markdown content
   */
  private calculateWordCount(content: string): number {
    // Remove markdown syntax and count words
    const cleanContent = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]*`/g, '') // Remove inline code
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // Remove images
      .replace(/\[[^\]]*\]\([^)]*\)/g, '') // Remove links
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/[*_~]/g, '') // Remove emphasis markers
      .replace(/\n\s*\n/g, ' ') // Replace multiple newlines with space
      .trim();

    // Count words (handles Japanese text better)
    const words = cleanContent.split(/\s+/).filter(word => word.length > 0);
    
    // For Japanese content, count characters instead of words
    const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(cleanContent);
    if (hasJapanese) {
      // Estimate words for Japanese: roughly 1 word per 2-3 characters
      const charCount = cleanContent.replace(/\s/g, '').length;
      return Math.ceil(charCount / 2.5);
    }

    return words.length;
  }

  /**
   * Estimate reading time in minutes
   */
  private estimateReadingTime(wordCount: number): number {
    // Average reading speed: 200-250 words per minute
    const wordsPerMinute = 225;
    const minutes = wordCount / wordsPerMinute;
    return Math.max(1, Math.ceil(minutes)); // Minimum 1 minute
  }

  /**
   * Validate date string format
   */
  private isValidDate(dateString: string): boolean {
    // Check YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }

    // Check if it's a valid date
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Extract table of contents from markdown content
   */
  extractTableOfContents(content: string): Array<{ title: string; level: number; anchor: string }> {
    const headings: Array<{ title: string; level: number; anchor: string }> = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^(#{1,6})\s(.+)$/);
      if (match) {
        const level = match[1].length;
        const title = match[2].trim();
        const anchor = this.slugify(title);
        
        headings.push({ title, level, anchor });
      }
    }

    return headings;
  }

  /**
   * Extract excerpt from content
   */
  extractExcerpt(content: string, maxLength: number = 160): string {
    // Remove markdown syntax and get plain text
    const cleanContent = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]*`/g, '') // Remove inline code
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // Remove images
      .replace(/\[[^\]]*\]\([^)]*\)/g, '$1') // Convert links to text
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/[*_~]/g, '') // Remove emphasis markers
      .replace(/\n\s*\n/g, ' ') // Replace multiple newlines with space
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (cleanContent.length <= maxLength) {
      return cleanContent;
    }

    // Truncate at word boundary
    const truncated = cleanContent.substring(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    
    if (lastSpaceIndex > maxLength * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...';
    }
    
    return truncated + '...';
  }
}

// Export factory function
export function createMDXParserService(): MDXParserService {
  return new MDXParserService();
}

// Export the service class and types
export { MDXParserService };
export type { MDXFrontmatter, ParsedMDXFile, MDXParsingOptions };