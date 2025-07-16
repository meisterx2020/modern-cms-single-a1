import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

interface CustomLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function CustomLink({ href, children, className }: CustomLinkProps) {
  const isExternal = href.startsWith('http') || href.startsWith('https');
  const isInternal = href.startsWith('/') || href.startsWith('#');

  const linkClasses = cn(
    'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200',
    'underline decoration-blue-600/30 hover:decoration-blue-600/60',
    'transition-colors duration-200',
    'inline-flex items-center gap-1',
    className
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses}
      >
        {children}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  }

  if (isInternal) {
    return (
      <Link href={href} className={linkClasses}>
        {children}
      </Link>
    );
  }

  // Fallback for other types of links
  return (
    <a href={href} className={linkClasses}>
      {children}
    </a>
  );
}