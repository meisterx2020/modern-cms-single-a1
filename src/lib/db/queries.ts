import { db } from './index';
import { contents, settings, type Content, type NewContent, type Setting, type NewSetting } from './schema';
import { eq, desc } from 'drizzle-orm';

// Content CRUD operations
export async function getContentBySlug(slug: string): Promise<Content | null> {
  try {
    const result = await db.select().from(contents).where(eq(contents.slug, slug)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching content by slug:', error);
    throw new Error('Failed to fetch content');
  }
}

export async function getAllContents(status?: string): Promise<Content[]> {
  try {
    let query = db.select().from(contents).orderBy(desc(contents.updatedAt));
    
    if (status) {
      query = query.where(eq(contents.status, status));
    }
    
    return await query;
  } catch (error) {
    console.error('Error fetching all contents:', error);
    throw new Error('Failed to fetch contents');
  }
}

export async function createContent(content: NewContent): Promise<Content> {
  try {
    const now = new Date();
    const contentWithTimestamps = {
      ...content,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.insert(contents).values(contentWithTimestamps).returning();
    return result[0];
  } catch (error) {
    console.error('Error creating content:', error);
    throw new Error('Failed to create content');
  }
}

export async function updateContent(id: number, updates: Partial<NewContent>): Promise<Content | null> {
  try {
    const updatesWithTimestamp = {
      ...updates,
      updatedAt: new Date(),
    };
    
    const result = await db
      .update(contents)
      .set(updatesWithTimestamp)
      .where(eq(contents.id, id))
      .returning();
    
    return result[0] || null;
  } catch (error) {
    console.error('Error updating content:', error);
    throw new Error('Failed to update content');
  }
}

export async function deleteContent(id: number): Promise<boolean> {
  try {
    await db.delete(contents).where(eq(contents.id, id));
    return true;
  } catch (error) {
    console.error('Error deleting content:', error);
    throw new Error('Failed to delete content');
  }
}

// Settings CRUD operations
export async function getSetting(key: string): Promise<Setting | null> {
  try {
    const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Error fetching setting:', error);
    throw new Error('Failed to fetch setting');
  }
}

export async function getAllSettings(category?: string): Promise<Setting[]> {
  try {
    let query = db.select().from(settings).orderBy(settings.category, settings.key);
    
    if (category) {
      query = query.where(eq(settings.category, category));
    }
    
    return await query;
  } catch (error) {
    console.error('Error fetching all settings:', error);
    throw new Error('Failed to fetch settings');
  }
}

export async function updateSetting(key: string, value: string, type?: string): Promise<Setting | null> {
  try {
    const now = new Date();
    const updates: Partial<NewSetting> = {
      value,
      updatedAt: now,
    };
    
    if (type) {
      updates.type = type;
    }
    
    const result = await db
      .update(settings)
      .set(updates)
      .where(eq(settings.key, key))
      .returning();
    
    return result[0] || null;
  } catch (error) {
    console.error('Error updating setting:', error);
    throw new Error('Failed to update setting');
  }
}

export async function createSetting(setting: NewSetting): Promise<Setting> {
  try {
    const now = new Date();
    const settingWithTimestamps = {
      ...setting,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await db.insert(settings).values(settingWithTimestamps).returning();
    return result[0];
  } catch (error) {
    console.error('Error creating setting:', error);
    throw new Error('Failed to create setting');
  }
}

export async function upsertSetting(key: string, value: string, type: string = 'string', description?: string, category?: string): Promise<Setting> {
  try {
    const existing = await getSetting(key);
    
    if (existing) {
      return await updateSetting(key, value, type) as Setting;
    } else {
      return await createSetting({
        key,
        value,
        type,
        description,
        category: category || 'general',
      });
    }
  } catch (error) {
    console.error('Error upserting setting:', error);
    throw new Error('Failed to upsert setting');
  }
}