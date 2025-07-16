import { getContentBySlug, getAllContents } from '@/lib/db/queries';
import { MDXContent } from '@/components/mdx-content';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

// Generate static params for ISR
export async function generateStaticParams(): Promise<{ slug: string[] }[]> {
  try {
    const contents = await getAllContents('published');
    
    return contents.map((content) => ({
      slug: content.slug.split('/').filter(Boolean),
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

// Generate metadata for SEO
export async function generateMetadata(
  { params }: PageProps
): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug.join('/');
  
  try {
    const content = await getContentBySlug(slug);
    
    if (!content) {
      return {
        title: 'Page Not Found',
        description: 'The requested page could not be found.',
      };
    }

    let frontmatter = {};
    if (content.frontmatter) {
      try {
        frontmatter = JSON.parse(content.frontmatter);
      } catch (e) {
        console.warn('Failed to parse frontmatter for metadata:', e);
      }
    }

    return {
      title: content.title,
      description: content.description || 'Content from our CMS',
      openGraph: {
        title: content.title,
        description: content.description || 'Content from our CMS',
        type: 'article',
        publishedTime: content.publishedAt?.toISOString(),
        modifiedTime: content.updatedAt.toISOString(),
        ...(frontmatter as Record<string, any>)?.openGraph,
      },
      twitter: {
        card: 'summary_large_image',
        title: content.title,
        description: content.description || 'Content from our CMS',
        ...(frontmatter as Record<string, any>)?.twitter,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Error',
      description: 'An error occurred while loading this page.',
    };
  }
}

export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug.join('/');

  try {
    const content = await getContentBySlug(slug);

    if (!content) {
      notFound();
    }

    // Check if content is published or in draft mode (you might want to check user permissions here)
    if (content.status !== 'published' && process.env.NODE_ENV === 'production') {
      notFound();
    }

    return (
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <MDXContent content={content} />
      </main>
    );
  } catch (error) {
    console.error('Error loading content:', error);
    
    // In development, show the error. In production, show 404.
    if (process.env.NODE_ENV === 'development') {
      return (
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h1 className="text-red-800 dark:text-red-200 font-bold text-xl mb-2">
              Development Error
            </h1>
            <p className="text-red-600 dark:text-red-300 mb-4">
              Failed to load content for slug: {slug}
            </p>
            <pre className="text-sm bg-red-100 dark:bg-red-900/40 p-4 rounded overflow-auto">
              {error instanceof Error ? error.message : String(error)}
            </pre>
          </div>
        </main>
      );
    }

    notFound();
  }
}

// Enable ISR with revalidation
export const revalidate = 60; // Revalidate every 60 seconds

// Enable dynamic rendering for development
export const dynamic = 'auto';