import { z } from 'zod';

// Define the schema for environment variables
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_AUTH_TOKEN: z.string().optional(),

  // GitHub Integration (optional)
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_OWNER: z.string().optional(),
  GITHUB_REPO: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // Next.js
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().optional(),

  // Application
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Content
  CONTENT_PREVIEW_MODE: z.string().default('true').transform(val => val === 'true'),
  ENABLE_DRAFT_CONTENT: z.string().default('true').transform(val => val === 'true'),

  // Performance
  REVALIDATE_TIME: z.string().default('60').transform(Number).pipe(z.number().positive()),
  CACHE_STATIC_CONTENT: z.string().default('true').transform(val => val === 'true'),

  // Security
  ALLOWED_ORIGINS: z.string().optional(),
  RATE_LIMIT_ENABLED: z.string().default('false').transform(val => val === 'true'),

  // Optional services
  ANALYTICS_ID: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  UPLOADTHING_SECRET: z.string().optional(),
  UPLOADTHING_APP_ID: z.string().optional(),
  ALGOLIA_APP_ID: z.string().optional(),
  ALGOLIA_API_KEY: z.string().optional(),
  ALGOLIA_SEARCH_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Validate and export environment variables
function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(err => {
        return `${err.path.join('.')}: ${err.message}`;
      });

      console.error('❌ Environment validation failed:');
      console.error(missingVars.join('\n'));
      
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Environment validation failed in production');
      } else {
        console.warn('⚠️  Environment validation failed, but continuing in development mode');
        // Return a default environment for development
        return envSchema.parse({
          DATABASE_URL: 'file:./local.db',
          NODE_ENV: 'development',
          APP_ENV: 'development',
          APP_URL: 'http://localhost:3000',
        });
      }
    }
    throw error;
  }
}

export const env = validateEnv();

// Helper functions for common environment checks
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// GitHub integration helpers
export const hasGitHubIntegration = Boolean(
  env.GITHUB_TOKEN && env.GITHUB_OWNER && env.GITHUB_REPO
);

// Database helpers
export const getDatabaseConfig = () => ({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});

// Content helpers
export const getContentConfig = () => ({
  previewMode: env.CONTENT_PREVIEW_MODE,
  enableDraftContent: env.ENABLE_DRAFT_CONTENT,
  revalidateTime: env.REVALIDATE_TIME,
  cacheStaticContent: env.CACHE_STATIC_CONTENT,
});

// Security helpers
export const getAllowedOrigins = (): string[] => {
  if (!env.ALLOWED_ORIGINS) return [];
  return env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
};

// Validation function for runtime checks
export function validateRequiredEnvVars(requiredVars: (keyof Env)[]): void {
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Export a function to get typed environment variables
export function getEnv<K extends keyof Env>(key: K): Env[K] {
  return env[key];
}