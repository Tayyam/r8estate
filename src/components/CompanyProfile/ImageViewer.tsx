import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  images,
  currentIndex,
  setCurrentIndex,
  onClose
}) => {
  // Navigate to previous image
  const previousImage = () => {
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  // Navigate to next image
  const nextImage = () => {
    setCurrentIndex(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        previousImage();
      } else if (event.key === 'ArrowRight') {
        nextImage();
      } else if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex]);

  // Handle backdrop click to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (images.length === 0) return null;

  return (
    <>
      {/* Full Screen Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-95 backdrop-blur-sm flex items-center justify-center"
        onClick={handleBackdropClick}
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 99999,
          margin: 0,
          padding: 0
        }}
      >
        {/* Main Container */}
        <div className="relative w-full h-full flex items-center justify-center p-4">
          
          {/* Close Button - Enhanced visibility */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-12 h-12 bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-2xl border-2 border-white border-opacity-30 hover:border-opacity-50 hover:scale-110"
            style={{
              backdropFilter: 'blur(10px)',
            }}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Image Counter - Enhanced visibility */}
          <div 
            className="absolute top-4 left-4 z-10 px-4 py-2 bg-black bg-opacity-70 text-white rounded-full text-sm font-medium shadow-2xl border-2 border-white border-opacity-30"
            style={{
              backdropFilter: 'blur(10px)',
            }}
          >
            {currentIndex + 1} / {images.length}
          </div>

          {/* Navigation Arrows - Enhanced visibility */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  previousImage();
                }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-14 h-14 bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-2xl border-2 border-white border-opacity-30 hover:border-opacity-50 hover:scale-110"
                style={{
                  backdropFilter: 'blur(10px)',
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 w-14 h-14 bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-full flex items-center justify-center transition-all duration-200 shadow-2xl border-2 border-white border-opacity-30 hover:border-opacity-50 hover:scale-110"
                style={{
                  backdropFilter: 'blur(10px)',
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          {/* Image Container - Contained within bounds */}
          <div 
            className="relative flex items-center justify-center"
            style={{ 
              maxWidth: 'calc(100vw - 160px)', 
              maxHeight: 'calc(100vh - 160px)',
              width: '100%',
              height: '100%'
            }}
          >
            <img
              src={images[currentIndex]}
              alt={`Gallery ${currentIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Thumbnail Navigation - Enhanced visibility */}
          {images.length > 1 && (
            <div 
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10"
              style={{ maxWidth: 'calc(100vw - 80px)' }}
            >
              <div 
                className="flex space-x-2 max-w-full overflow-x-auto px-4 py-3 bg-black bg-opacity-70 rounded-2xl shadow-2xl border-2 border-white border-opacity-30"
                style={{
                  backdropFilter: 'blur(10px)',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent'
                }}
              >
                {images.map((imageUrl, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(index);
                    }}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 hover:scale-110 ${
                      index === currentIndex
                        ? 'border-white shadow-lg'
                        : 'border-white border-opacity-50 hover:border-opacity-80'
                    }`}
                    style={{
                      boxShadow: index === currentIndex 
                        ? '0 4px 16px rgba(255, 255, 255, 0.3)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.3)'
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global style injection to ensure full coverage */}
      <style jsx global>{`
        body.modal-open {
          overflow: hidden !important;
        }
      `}</style>
    </>
  );
};

export default ImageViewer;