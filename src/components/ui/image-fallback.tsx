import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackClassName?: string;
}

export const ImageWithFallback = ({
  src,
  alt,
  className,
  fallbackClassName,
  ...props
}: ImageWithFallbackProps) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error || !src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-slate-100 dark:bg-slate-800',
          fallbackClassName || className
        )}
      >
        <div className="text-center p-4">
          <ImageOff className="h-8 w-8 mx-auto text-slate-400 dark:text-slate-500 mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400">No image available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div
          className={cn(
            'animate-pulse bg-slate-200 dark:bg-slate-700',
            className
          )}
        />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(className, loading && 'hidden')}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        {...props}
      />
    </>
  );
};
