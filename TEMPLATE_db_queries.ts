// Template: Database Query Functions - src/lib/db/queries.ts
// DO NOT IMPLEMENT UNTIL DATABASE SETUP IS COMPLETE

import { eq, desc, and } from 'drizzle-orm';
import { db } from './connection'; // Assuming database connection export
import { contents, settings } from './schema'; // Assuming schema definitions

// Types for database operations
export interface Content {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  content_raw: string;
  frontmatter: string | null; // JSON string
  status: 'draft' | 'published' | 'archived';
  access_level: 'public' | 'private' | 'premium';
  created_at: Date;
  updated_at: Date;
}

export interface NewContent {
  slug: string;
  title: string;
  description?: string;
  content_raw: string;
  frontmatter?: string;
  status?: 'draft' | 'published' | 'archived';
  access_level?: 'public' | 'private' | 'premium';
}

export interface ContentUpdate {
  title?: string;
  description?: string;
  content_raw?: string;
  frontmatter?: string;
  status?: 'draft' | 'published' | 'archived';
  access_level?: 'public' | 'private' | 'premium';
  updated_at?: Date;
}

export interface Setting {
  key: string;
  value: string; // JSON string
  updated_at: Date;
}

// Custom error classes for better error handling
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ContentNotFoundError extends DatabaseError {
  constructor(slug: string) {
    super(`Content not found: ${slug}`, 'CONTENT_NOT_FOUND');
  }
}

export class SettingNotFoundError extends DatabaseError {
  constructor(key: string) {
    super(`Setting not found: ${key}`, 'SETTING_NOT_FOUND');
  }
}

// Content Query Functions
export async function getContentBySlug(slug: string): Promise<Content | null> {
  try {
    const result = await db.query.contents.findFirst({
      where: (contents, { eq }) => eq(contents.slug, slug)
    });

    return result || null;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get content by slug: ${slug}`,
      'QUERY_FAILED',
      error as Error
    );
  }
}

export async function getAllContents(options?: {
  status?: 'draft' | 'published' | 'archived';
  access_level?: 'public' | 'private' | 'premium';
  limit?: number;
  offset?: number;
}): Promise<Content[]> {
  try {
    const { status, access_level, limit, offset } = options || {};

    // Build where conditions
    const conditions = [];
    if (status) {
      conditions.push(eq(contents.status, status));
    }
    if (access_level) {
      conditions.push(eq(contents.access_level, access_level));
    }

    let query = db.query.contents.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(contents.updated_at)],
    });

    // Apply pagination if specified
    if (limit !== undefined) {
      query = query.limit(limit);
    }
    if (offset !== undefined) {
      query = query.offset(offset);
    }

    return await query;
  } catch (error) {
    throw new DatabaseError(
      'Failed to get all contents',
      'QUERY_FAILED',
      error as Error
    );
  }
}

export async function updateContent(
  id: string,
  updates: ContentUpdate
): Promise<Content> {
  try {
    // Set updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date()
    };

    const result = await db
      .update(contents)
      .set(updateData)
      .where(eq(contents.id, id))
      .returning();

    if (result.length === 0) {
      throw new ContentNotFoundError(id);
    }

    return result[0];
  } catch (error) {
    if (error instanceof ContentNotFoundError) {
      throw error;
    }
    throw new DatabaseError(
      `Failed to update content: ${id}`,
      'UPDATE_FAILED',
      error as Error
    );
  }
}

export async function createContent(data: NewContent): Promise<Content> {
  try {
    // Generate ID (you might want to use a proper ID generation strategy)
    const id = crypto.randomUUID();
    const now = new Date();

    const contentData = {
      id,
      ...data,
      status: data.status || 'draft',
      access_level: data.access_level || 'public',
      created_at: now,
      updated_at: now
    };

    const result = await db
      .insert(contents)
      .values(contentData)
      .returning();

    return result[0];
  } catch (error) {
    throw new DatabaseError(
      'Failed to create content',
      'INSERT_FAILED',
      error as Error
    );
  }
}

// Settings Query Functions
export async function getSettings(key?: string): Promise<Setting | Setting[] | null> {
  try {
    if (key) {
      // Get specific setting
      const result = await db.query.settings.findFirst({
        where: (settings, { eq }) => eq(settings.key, key)
      });
      return result || null;
    } else {
      // Get all settings
      const result = await db.query.settings.findMany({
        orderBy: [contents.key] // Assuming key field for ordering
      });
      return result;
    }
  } catch (error) {
    throw new DatabaseError(
      key ? `Failed to get setting: ${key}` : 'Failed to get all settings',
      'QUERY_FAILED',
      error as Error
    );
  }
}

export async function updateSettings(key: string, value: any): Promise<Setting> {
  try {
    const now = new Date();
    const valueString = typeof value === 'string' ? value : JSON.stringify(value);

    // Upsert operation (insert if not exists, update if exists)
    const result = await db
      .insert(settings)
      .values({
        key,
        value: valueString,
        updated_at: now
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: valueString,
          updated_at: now
        }
      })
      .returning();

    return result[0];
  } catch (error) {
    throw new DatabaseError(
      `Failed to update setting: ${key}`,
      'UPSERT_FAILED',
      error as Error
    );
  }
}

// Utility functions for error handling
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

export function isContentNotFoundError(error: unknown): error is ContentNotFoundError {
  return error instanceof ContentNotFoundError;
}

export function isSettingNotFoundError(error: unknown): error is SettingNotFoundError {
  return error instanceof SettingNotFoundError;
}

// Helper function to parse frontmatter JSON safely
export function parseFrontmatter(frontmatter: string | null): Record<string, any> | null {
  if (!frontmatter) return null;
  
  try {
    return JSON.parse(frontmatter);
  } catch (error) {
    console.warn('Failed to parse frontmatter JSON:', error);
    return null;
  }
}

// Helper function to parse settings value JSON safely
export function parseSettingValue<T = any>(value: string): T | null {
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse setting value JSON:', error);
    return null;
  }
}

// Transaction helper for complex operations
export async function withTransaction<T>(
  callback: (tx: typeof db) => Promise<T>
): Promise<T> {
  try {
    return await db.transaction(callback);
  } catch (error) {
    throw new DatabaseError(
      'Transaction failed',
      'TRANSACTION_FAILED',
      error as Error
    );
  }
}

// Batch operations for webhook sync
export async function batchUpdateContents(
  updates: Array<{ slug: string; data: ContentUpdate }>
): Promise<Content[]> {
  return await withTransaction(async (tx) => {
    const results: Content[] = [];
    
    for (const { slug, data } of updates) {
      // Find content by slug first
      const existing = await tx.query.contents.findFirst({
        where: (contents, { eq }) => eq(contents.slug, slug)
      });

      if (existing) {
        const updated = await tx
          .update(contents)
          .set({ ...data, updated_at: new Date() })
          .where(eq(contents.id, existing.id))
          .returning();
        results.push(updated[0]);
      }
    }
    
    return results;
  });
}

export async function batchCreateContents(
  contentList: NewContent[]
): Promise<Content[]> {
  return await withTransaction(async (tx) => {
    const results: Content[] = [];
    
    for (const contentData of contentList) {
      const id = crypto.randomUUID();
      const now = new Date();

      const fullData = {
        id,
        ...contentData,
        status: contentData.status || 'draft',
        access_level: contentData.access_level || 'public',
        created_at: now,
        updated_at: now
      };

      const created = await tx
        .insert(contents)
        .values(fullData)
        .returning();
      
      results.push(created[0]);
    }
    
    return results;
  });
}