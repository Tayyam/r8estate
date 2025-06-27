import React, { useState, useRef, useEffect } from 'react';
import { Camera, Plus, Trash2, Eye } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import ImageViewer from './ImageViewer';

interface PhotoGalleryProps {
  galleryImages: string[];
  setGalleryImages: (images: string[]) => void;
  canEdit: boolean;
  setShowImageUpload: (show: boolean) => void;
  uploadLoading: boolean;
  setUploadLoading: (loading: boolean) => void;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
  company: CompanyProfileType;
}

// Lazy Image Component with Intersection Observer
const LazyImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}> = ({ src, alt, className, onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {isInView && (
        <>
          {/* Loading placeholder */}
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
              <Camera className="h-8 w-8 text-gray-400" />
            </div>
          )}
          
          {/* Actual image */}
          <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsLoaded(true)}
            onClick={onClick}
            loading="lazy"
          />
        </>
      )}
      
      {/* Fallback placeholder when not in view */}
      {!isInView && (
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <Camera className="h-8 w-8 text-gray-300" />
        </div>
      )}
    </div>
  );
};

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  galleryImages,
  setGalleryImages,
  canEdit,
  setShowImageUpload,
  uploadLoading,
  setUploadLoading,
  setSuccess,
  setError,
  company
}) => {
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAllImages, setShowAllImages] = useState(false);

  // Delete image from Firebase Storage
  const deleteImage = async (imageUrl: string) => {
    try {
      const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/r8estate-2a516.firebasestorage.app/o/';
      if (imageUrl.startsWith(baseUrl)) {
        const filePath = decodeURIComponent(imageUrl.replace(baseUrl, '').split('?')[0]);
        const storageRef = ref(storage, filePath);
        await deleteObject(storageRef);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  // Handle gallery image deletion
  const handleDeleteGalleryImage = async (imageUrl: string) => {
    if (!canEdit) return;

    try {
      setUploadLoading(true);
      
      // Delete from storage
      await deleteImage(imageUrl);
      
      // Remove from gallery array
      const updatedGallery = galleryImages.filter(img => img !== imageUrl);
      
      // Update company document
      await updateDoc(doc(db, 'companies', company.id), {
        galleryImages: updatedGallery,
        updatedAt: new Date()
      });

      setGalleryImages(updatedGallery);
      setSuccess('Image removed from gallery');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting gallery image:', error);
      setError('Failed to delete image');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUploadLoading(false);
    }
  };

  // Open image viewer
  const openImageViewer = (index: number) => {
    setCurrentImageIndex(index);
    setShowImageViewer(true);
  };

  // Get displayed images (only first 4 or all if showAllImages is true)
  const displayedImages = showAllImages ? galleryImages : galleryImages.slice(0, 4);

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Photo Gallery</h2>
            {canEdit && (
              <button
                onClick={() => setShowImageUpload(true)}
                className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200"
              >
                <Plus className="h-4 w-4" />
                <span>Add Photos</span>
              </button>
            )}
          </div>
        </div>

        {/* Gallery Content Container */}
        <div className="p-8">
          {galleryImages.length > 0 ? (
            <div className="max-w-6xl mx-auto">
              {/* Images Grid Container */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                  {displayedImages.map((imageUrl, index) => (
                    <div 
                      key={index} 
                      className="relative group"
                    >
                      {/* Individual Image Container with Fixed Aspect Ratio */}
                      <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl group-hover:scale-[1.02]">
                        {/* Image Container with 16:10 Aspect Ratio */}
                        <div 
                          className="relative w-full overflow-hidden cursor-pointer"
                          style={{ 
                            aspectRatio: '16/10',
                            minHeight: '250px'
                          }}
                          onClick={() => openImageViewer(index)}
                        >
                          {/* Lazy Loaded Image */}
                          <LazyImage
                            src={imageUrl}
                            alt={`Gallery ${index + 1}`}
                            className="absolute inset-0 hover:scale-105 transition-transform duration-300"
                          />

                          {/* Overlay with Actions */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-3 rtl:space-x-reverse">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openImageViewer(index);
                                }}
                                className="p-3 bg-white bg-opacity-95 hover:bg-white text-gray-800 rounded-full transition-all duration-200 shadow-lg hover:scale-110 backdrop-blur-sm"
                                title="View Image"
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                              {canEdit && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteGalleryImage(imageUrl);
                                  }}
                                  disabled={uploadLoading}
                                  className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all duration-200 shadow-lg hover:scale-110 disabled:opacity-50"
                                  title="Delete Image"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Loading indicator for uploads */}
                          {uploadLoading && (
                            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>

                      
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Show More/Less Button */}
              {galleryImages.length > 4 && (
                <div className="text-center">
                  <button
                    onClick={() => setShowAllImages(!showAllImages)}
                    className="inline-flex items-center space-x-2 rtl:space-x-reverse px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                  >
                    <span>
                      {showAllImages 
                        ? `Show Less` 
                        : `View All ${galleryImages.length} Photos`
                      }
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Empty State Container */
            <div className="max-w-md mx-auto">
              <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-200">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Camera className="h-10 w-10 text-gray-300" />
                </div>
                <p className="text-gray-500 text-xl mb-2 font-medium">No photos in gallery yet</p>
                <p className="text-gray-400 text-sm mb-6">Add photos to showcase your company</p>
                {canEdit && (
                  <button
                    onClick={() => setShowImageUpload(true)}
                    className="inline-flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Add First Photo</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Viewer Modal */}
      {showImageViewer && (
        <ImageViewer
          images={galleryImages}
          currentIndex={currentImageIndex}
          setCurrentIndex={setCurrentImageIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </>
  );
};

export default PhotoGallery;