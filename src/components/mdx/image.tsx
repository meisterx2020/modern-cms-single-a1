import { cn } from '@/lib/utils';
import Image from 'next/image';

interface CustomImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  caption?: string;
}

export function CustomImage({ 
  src, 
  alt, 
  width = 800, 
  height = 600, 
  className,
  caption 
}: CustomImageProps) {
  return (
    <figure className={cn('my-6', className)}>
      <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-auto object-cover"
          priority={false}
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}