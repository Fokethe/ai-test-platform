'use client';

import { useState } from 'react';
import { useLazyImage } from '@/lib/performance/lazy-load';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  lazy?: boolean;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  lazy = true,
  priority = false,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const { imgRef, isInView } = useLazyImage(src, {
    rootMargin: '100px',
  });

  const shouldLoad = priority || !lazy || isInView;

  return (
    <div
      ref={imgRef}
      className={cn('relative overflow-hidden bg-slate-100', className)}
      style={{ width, height }}
    >
      {!isLoaded && shouldLoad && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      )}
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          onLoad={() => setIsLoaded(true)}
        />
      )}
    </div>
  );
}
