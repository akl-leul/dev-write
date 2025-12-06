import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
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
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setScale(1);
  }, [initialIndex, isOpen]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'Escape':
        if (isExpanded) {
          setIsExpanded(false);
        } else {
          onClose();
        }
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
  }, [isOpen, images.length, onClose, isExpanded]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // Don't prevent scrolling when lightbox is open
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

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

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isOpen || images.length === 0) return null;

  return (
    <div 
      className={cn(
        "fixed bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 z-40",
        isExpanded 
          ? "inset-4 md:inset-8" 
          : "bottom-4 right-4 w-[400px] h-[500px] md:w-[500px] md:h-[600px]"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-900">
            {images[currentIndex]?.alt || `Image ${currentIndex + 1}`}
          </h3>
          {images.length > 1 && (
            <span className="text-sm text-slate-500 bg-slate-200 px-2 py-1 rounded-full">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Expand/Collapse button */}
          <button
            onClick={toggleExpanded}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          
          {/* Zoom button */}
          <button
            onClick={toggleZoom}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            aria-label={scale === 1 ? "Zoom in" : "Zoom out"}
          >
            {scale === 1 ? <ZoomIn className="h-4 w-4" /> : <ZoomOut className="h-4 w-4" />}
          </button>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors"
            aria-label="Close lightbox"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col h-[calc(100%-73px)]">
        {/* Image container */}
        <div className="flex-1 relative overflow-auto bg-slate-50 p-4">
          <div className="flex items-center justify-center h-full">
            <img
              src={images[currentIndex]?.url}
              alt={images[currentIndex]?.alt || `Image ${currentIndex + 1}`}
              className={cn(
                "max-w-full max-h-full object-contain transition-transform duration-300",
                scale > 1 && "cursor-move"
              )}
              style={{ transform: `scale(${scale})` }}
              draggable={false}
            />
          </div>
        </div>

        {/* Navigation buttons */}
        {images.length > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-white">
            <button
              onClick={goPrev}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous image"
              disabled={images.length === 1}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Thumbnail strip */}
            <div className="flex gap-2 max-w-[200px] overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setScale(1);
                  }}
                  className={cn(
                    "w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0",
                    idx === currentIndex 
                      ? "border-blue-500 opacity-100" 
                      : "border-slate-200 opacity-60 hover:opacity-80"
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

            <button
              onClick={goNext}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next image"
              disabled={images.length === 1}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
