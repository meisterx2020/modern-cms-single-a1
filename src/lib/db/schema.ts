import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Type definitions for enums
export type ContentStatus = 'draft' | 'published' | 'archived';
export type AccessLevel = 'public' | 'private' | 'premium';

// Contents table schema
export const contents = sqliteTable('contents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  content_raw: text('content_raw').notNull(),
  frontmatter: text('frontmatter', { mode: 'json' }).$type<Record<string, unknown>>(),
  status: text('status').$type<ContentStatus>().notNull().default('draft'),
  access_level: text('access_level').$type<AccessLevel>().notNull().default('public'),
  created_at: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Settings table schema
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value', { mode: 'json' }).$type<unknown>().notNull(),
  updated_at: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Export types for use in application
export type Content = typeof contents.$inferSelect;
export type NewContent = typeof contents.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;