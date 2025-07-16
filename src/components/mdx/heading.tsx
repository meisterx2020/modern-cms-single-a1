import { cn } from '@/lib/utils';
import Link from 'next/link';

interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  id?: string;
  className?: string;
}

export function Heading({ level, children, id, className }: HeadingProps) {
  const Component = `h${level}` as keyof React.JSX.IntrinsicElements;
  
  const baseClasses = {
    1: 'text-4xl font-bold tracking-tight lg:text-5xl mb-6',
    2: 'text-3xl font-semibold tracking-tight mb-4',
    3: 'text-2xl font-semibold tracking-tight mb-3',
    4: 'text-xl font-semibold tracking-tight mb-3',
    5: 'text-lg font-semibold tracking-tight mb-2',
    6: 'text-base font-semibold tracking-tight mb-2'
  };

  return (
    <Component
      id={id}
      className={cn(
        baseClasses[level],
        'group scroll-mt-20',
        className
      )}
    >
      {id && (
        <Link
          href={`#${id}`}
          className="absolute -ml-8 pr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-label={`Link to ${children}`}
        >
          #
        </Link>
      )}
      {children}
    </Component>
  );
}

// Individual heading components for MDX
export const H1 = ({ children, ...props }: { children: React.ReactNode; id?: string }) => (
  <Heading level={1} {...props}>{children}</Heading>
);

export const H2 = ({ children, ...props }: { children: React.ReactNode; id?: string }) => (
  <Heading level={2} {...props}>{children}</Heading>
);

export const H3 = ({ children, ...props }: { children: React.ReactNode; id?: string }) => (
  <Heading level={3} {...props}>{children}</Heading>
);

export const H4 = ({ children, ...props }: { children: React.ReactNode; id?: string }) => (
  <Heading level={4} {...props}>{children}</Heading>
);

export const H5 = ({ children, ...props }: { children: React.ReactNode; id?: string }) => (
  <Heading level={5} {...props}>{children}</Heading>
);

export const H6 = ({ children, ...props }: { children: React.ReactNode; id?: string }) => (
  <Heading level={6} {...props}>{children}</Heading>
);