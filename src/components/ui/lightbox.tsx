import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LightboxProps {
  images: { url: string; alt?: string }[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const Lightbox = ({ images, initialIndex = 0, isOpen, onClose }: LightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setScale(1);
  }, [initialIndex, isOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
        setScale(1);
        break;
      case 'ArrowRight':
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
        setScale(1);
        break;
    }
  }, [isOpen, images.length, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [handleKeyDown, isOpen]);

  const goNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setScale(1);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setScale(1);
  };

  const toggleZoom = () => {
    setScale((prev) => (prev === 1 ? 2 : 1));
  };

  if (!isOpen || images.length === 0) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close lightbox"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Zoom button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleZoom();
        }}
        className="absolute top-4 right-16 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label={scale === 1 ? "Zoom in" : "Zoom out"}
      >
        {scale === 1 ? <ZoomIn className="h-6 w-6" /> : <ZoomOut className="h-6 w-6" />}
      </button>

      {/* Navigation buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-4 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute right-4 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      {/* Main image */}
      <div 
        className="relative max-w-[90vw] max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[currentIndex]?.url}
          alt={images[currentIndex]?.alt || `Image ${currentIndex + 1}`}
          className={cn(
            "max-w-full max-h-[85vh] object-contain transition-transform duration-300",
            scale > 1 && "cursor-move"
          )}
          style={{ transform: `scale(${scale})` }}
          draggable={false}
        />
      </div>

      {/* Image counter */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium backdrop-blur-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto p-2 bg-white/5 rounded-lg backdrop-blur-sm">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
                setScale(1);
              }}
              className={cn(
                "w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0",
                idx === currentIndex 
                  ? "border-white opacity-100" 
                  : "border-transparent opacity-50 hover:opacity-75"
              )}
            >
              <img
                src={img.url}
                alt={img.alt || `Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
