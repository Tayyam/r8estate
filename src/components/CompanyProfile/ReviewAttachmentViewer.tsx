import React, { useState, useEffect } from 'react';
import { FileText, ExternalLink, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface Attachment {
  url: string;
  type: 'image' | 'pdf';
  name?: string;
}

interface ReviewAttachmentViewerProps {
  attachments: Attachment[];
  initialIndex: number;
  onClose: () => void;
}

const ReviewAttachmentViewer: React.FC<ReviewAttachmentViewerProps> = ({
  attachments,
  initialIndex,
  onClose
}) => {
  const { translations } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);

  const currentAttachment = attachments[currentIndex];

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentIndex, attachments.length]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsLoading(true);
    }
  };

  const handleNext = () => {
    if (currentIndex < attachments.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsLoading(true);
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col"
      onClick={handleBackdropClick}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between text-white">
        <div className="flex items-center">
          <button
            className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
          <h3 className="ml-4 font-medium text-lg truncate max-w-md">
            {currentAttachment.name || `${translations?.attachment || 'Attachment'} ${currentIndex + 1}/${attachments.length}`}
          </h3>
        </div>
        
        <div className="flex items-center">
          <a 
            href={currentAttachment.url} 
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full hover:bg-white/10 transition-colors duration-200"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Navigation Buttons */}
        {attachments.length > 1 && (
          <>
            <button
              className={`absolute left-4 p-3 rounded-full ${
                currentIndex === 0 
                  ? 'text-gray-600 cursor-not-allowed' 
                  : 'text-white hover:bg-white/10'
              } transition-colors duration-200`}
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              className={`absolute right-4 p-3 rounded-full ${
                currentIndex === attachments.length - 1 
                  ? 'text-gray-600 cursor-not-allowed' 
                  : 'text-white hover:bg-white/10'
              } transition-colors duration-200`}
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              disabled={currentIndex === attachments.length - 1}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-4xl w-full max-h-full flex items-center justify-center p-4">
          {currentAttachment.type === 'image' ? (
            <img
              src={currentAttachment.url}
              alt={currentAttachment.name || `Image ${currentIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain"
              onLoad={handleImageLoad}
            />
          ) : (
            <div className="w-full h-[80vh] bg-white rounded-lg overflow-hidden">
              <iframe
                src={currentAttachment.url}
                title={currentAttachment.name || `PDF ${currentIndex + 1}`}
                className="w-full h-full"
                onLoad={handleImageLoad}
              />
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Navigation */}
      {attachments.length > 1 && (
        <div className="bg-black/50 p-4 overflow-x-auto">
          <div className="flex space-x-2 justify-center">
            {attachments.map((attachment, index) => (
              <button
                key={index}
                className={`w-16 h-16 flex-shrink-0 border-2 rounded-md overflow-hidden ${
                  currentIndex === index ? 'border-blue-500' : 'border-transparent hover:border-white/50'
                } transition-all duration-200`}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                  setIsLoading(true);
                }}
              >
                {attachment.type === 'image' ? (
                  <img
                    src={attachment.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <FileText className="h-8 w-8 text-gray-700" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewAttachmentViewer;