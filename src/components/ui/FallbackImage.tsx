import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface FallbackImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackText?: string;
  priority?: boolean;
}

export const FallbackImage = ({ 
  src, 
  alt, 
  className = '', 
  fallbackText = 'No Image Available',
  priority = false 
}: FallbackImageProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${className}`}
        role="img"
        aria-label={fallbackText}
      >
        <div className="text-center p-4">
          <ImageOff className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {fallbackText}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className={`bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`} />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0 absolute' : 'opacity-100'}`}
        onError={handleError}
        onLoad={handleLoad}
        loading={priority ? 'eager' : 'lazy'}
      />
    </>
  );
};
