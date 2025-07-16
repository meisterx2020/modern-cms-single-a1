'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  children: string;
  className?: string;
  language?: string;
}

export function CodeBlock({ children, className, language }: CodeBlockProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Extract language from className (format: language-javascript)
  const lang = language || className?.replace('language-', '') || 'text';

  useEffect(() => {
    const highlightCode = async () => {
      try {
        setIsLoading(true);
        const html = await codeToHtml(children.trim(), {
          lang: lang,
          theme: 'github-dark',
          transformers: [
            {
              name: 'add-classes',
              code(node) {
                node.properties.class = cn(
                  'overflow-x-auto text-sm',
                  'p-4 rounded-lg',
                  'bg-gray-900 dark:bg-gray-950'
                );
              }
            }
          ]
        });
        setHighlightedCode(html);
      } catch (error) {
        console.error('Error highlighting code:', error);
        // Fallback to plain text
        setHighlightedCode(`<pre class="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto"><code>${children}</code></pre>`);
      } finally {
        setIsLoading(false);
      }
    };

    highlightCode();
  }, [children, lang]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="my-6 relative">
        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-6 relative group">
      <div className="flex items-center justify-between bg-gray-800 dark:bg-gray-900 px-4 py-2 rounded-t-lg">
        <span className="text-sm text-gray-400 font-mono">{lang}</span>
        <button
          onClick={handleCopy}
          className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <div 
        dangerouslySetInnerHTML={{ __html: highlightedCode }}
        className="[&_pre]:rounded-t-none [&_pre]:mt-0"
      />
    </div>
  );
}

// Inline code component
export function InlineCode({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code className={cn(
      'px-1.5 py-0.5 rounded-md',
      'bg-gray-100 dark:bg-gray-800',
      'text-gray-900 dark:text-gray-100',
      'font-mono text-sm',
      'border border-gray-200 dark:border-gray-700',
      className
    )}>
      {children}
    </code>
  );
}