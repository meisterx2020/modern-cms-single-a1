'use client';

import { MDXProvider } from '@mdx-js/react';
import { H1, H2, H3, H4, H5, H6 } from './heading';
import { Paragraph } from './paragraph';
import { CustomLink } from './link';
import { CustomImage } from './image';
import { CodeBlock, InlineCode } from './code-block';

// MDX component mapping
const mdxComponents = {
  // Headings
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  h6: H6,
  
  // Text
  p: Paragraph,
  
  // Links and media
  a: CustomLink,
  img: CustomImage,
  
  // Code
  pre: ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => {
    // Extract code from pre > code structure
    const codeElement = children?.props?.children;
    const className = children?.props?.className;
    
    if (typeof codeElement === 'string') {
      return (
        <CodeBlock 
          className={className}
          language={className?.replace('language-', '')}
        >
          {codeElement}
        </CodeBlock>
      );
    }
    
    return <pre {...props}>{children}</pre>;
  },
  code: InlineCode,
  
  // Lists
  ul: ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => (
    <ul className="mb-4 ml-6 list-disc space-y-1" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => (
    <li className="text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </li>
  ),
  
  // Blockquote
  blockquote: ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => (
    <blockquote 
      className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-600 dark:text-gray-400"
      {...props}
    >
      {children}
    </blockquote>
  ),
  
  // Tables
  table: ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => (
    <div className="my-6 overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300 dark:border-gray-700" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => (
    <thead className="bg-gray-50 dark:bg-gray-800" {...props}>
      {children}
    </thead>
  ),
  tr: ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => (
    <tr className="border-b border-gray-300 dark:border-gray-700" {...props}>
      {children}
    </tr>
  ),
  th: ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => (
    <th className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: { children?: React.ReactNode; [key: string]: any }) => (
    <td className="px-4 py-2 text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </td>
  ),
  
  // Horizontal rule
  hr: (props: { [key: string]: any }) => (
    <hr className="my-8 border-gray-300 dark:border-gray-700" {...props} />
  ),
};

interface MDXWrapperProps {
  children: React.ReactNode;
}

export function MDXWrapper({ children }: MDXWrapperProps) {
  return (
    <MDXProvider components={mdxComponents}>
      <div className="prose prose-gray dark:prose-invert max-w-none">
        {children}
      </div>
    </MDXProvider>
  );
}

export { mdxComponents };
export default MDXWrapper;