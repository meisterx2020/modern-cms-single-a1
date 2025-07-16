import { cn } from '@/lib/utils';

interface ParagraphProps {
  children: React.ReactNode;
  className?: string;
}

export function Paragraph({ children, className }: ParagraphProps) {
  return (
    <p className={cn(
      'mb-4 leading-7 text-gray-700 dark:text-gray-300',
      className
    )}>
      {children}
    </p>
  );
}