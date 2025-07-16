'use client';

import { MDXWrapper } from '@/components/mdx';
import { Content } from '@/lib/db/schema';
import { serialize } from 'next-mdx-remote/serialize';
import { MDXRemote, MDXRemoteSerializeResult } from 'next-mdx-remote';
import { useEffect, useState } from 'react';

interface MDXContentProps {
  content: Content;
}

export function MDXContent({ content }: MDXContentProps) {
  const [mdxSource, setMdxSource] = useState<MDXRemoteSerializeResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processMDX = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Parse frontmatter if it exists
        let frontmatter = {};
        if (content.frontmatter) {
          try {
            frontmatter = JSON.parse(content.frontmatter);
          } catch (e) {
            console.warn('Failed to parse frontmatter:', e);
          }
        }

        const mdxSource = await serialize(content.content, {
          mdxOptions: {
            remarkPlugins: [],
            rehypePlugins: [],
            development: process.env.NODE_ENV === 'development',
          },
          scope: {
            ...frontmatter,
            title: content.title,
            description: content.description,
          },
        });

        setMdxSource(mdxSource);
      } catch (err) {
        console.error('Error processing MDX:', err);
        setError('Failed to render content');
      } finally {
        setIsLoading(false);
      }
    };

    processMDX();
  }, [content]);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6 mb-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-4/6"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error</h3>
        <p className="text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (!mdxSource) {
    return (
      <div className="text-gray-500 dark:text-gray-400">
        No content available
      </div>
    );
  }

  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight mb-2">{content.title}</h1>
        {content.description && (
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
            {content.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <time dateTime={content.publishedAt?.toISOString() || content.createdAt.toISOString()}>
            {content.publishedAt?.toLocaleDateString() || content.createdAt.toLocaleDateString()}
          </time>
          <span className="capitalize">{content.status}</span>
        </div>
      </header>
      
      <MDXWrapper>
        <MDXRemote {...mdxSource} />
      </MDXWrapper>
    </article>
  );
}