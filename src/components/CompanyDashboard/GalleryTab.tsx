import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, getDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Company } from '../../types/company';
import { Image, Upload, Trash2, Eye, X, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import ImageViewer from '../CompanyProfile/ImageViewer';

interface GalleryTabProps {
  company: Company;
}

const GalleryTab: React.FC<GalleryTabProps> = ({ company }) => {
  const { translations } = useLanguage();
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load gallery images
  useEffect(() => {
    const loadGallery = async () => {
      try {
        setLoading(true);
        
        const companyDoc = await getDoc(doc(db, 'companies', company.id));
        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          if (companyData.galleryImages && Array.isArray(companyData.galleryImages)) {
            setGalleryImages(companyData.galleryImages);
          } else {
            setGalleryImages([]);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading gallery:', error);
        setError(translations?.failedToLoadGallery || 'Failed to load gallery images');
        setLoading(false);
      }
    };
    
    loadGallery();
  }, [company.id, translations?.failedToLoadGallery]);

  // Compress image before upload
  const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Upload image to Firebase Storage
  const uploadImage = async (file: File): Promise<string> => {
    try {
      const compressedFile = await compressImage(file);
      
      const timestamp = Date.now();
      const fileExtension = compressedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${timestamp}.${fileExtension}`;
      const storageRef = ref(storage, `company-gallery/${company.id}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

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
      console.error('Error deleting image from storage:', error);
      // Continue with deletion from Firestore even if storage deletion fails
    }
  };

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    await handleFilesUpload(files);
    
    // Reset input value to allow selecting the same files again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle files upload
  const handleFilesUpload = async (files: File[]) => {
    // Validate files
    const validFiles = files.filter(file => {
      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError(translations?.invalidFileType || 'Invalid file type. Please upload an image file (JPEG, PNG, GIF, WEBP)');
        setTimeout(() => setError(''), 3000);
        return false;
      }
      
      // Check file size (max 3MB)
      const maxSize = 3 * 1024 * 1024; // 3MB
      if (file.size > maxSize) {
        setError(translations?.fileTooLarge || 'File too large. Maximum size is 3MB');
        setTimeout(() => setError(''), 3000);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    try {
      setUploading(true);
      
      // Upload each image
      const uploadPromises = validFiles.map(file => uploadImage(file));
      const imageUrls = await Promise.all(uploadPromises);
      
      // Update gallery in Firestore
      const companyRef = doc(db, 'companies', company.id);
      const companyDoc = await getDoc(companyRef);
      
      if (companyDoc.exists()) {
        const currentGallery = companyDoc.data().galleryImages || [];
        const updatedGallery = [...currentGallery, ...imageUrls];
        
        await updateDoc(companyRef, {
          galleryImages: updatedGallery,
          updatedAt: new Date()
        });
        
        setGalleryImages(updatedGallery);
        setSuccess(translations?.imagesUploadedSuccess || 'Images uploaded successfully');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      setError(translations?.failedToUploadImages || 'Failed to upload images');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUploading(false);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      await handleFilesUpload(files);
    }
  };

  // Handle delete image
  const handleDeleteImage = async (imageUrl: string) => {
    try {
      await deleteImage(imageUrl);
      
      // Update Firestore
      const companyRef = doc(db, 'companies', company.id);
      await updateDoc(companyRef, {
        galleryImages: arrayRemove(imageUrl),
        updatedAt: new Date()
      });
      
      // Update local state
      setGalleryImages(prev => prev.filter(img => img !== imageUrl));
      setSuccess(translations?.imageDeletedSuccess || 'Image deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting image:', error);
      setError(translations?.failedToDeleteImage || 'Failed to delete image');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Open image viewer
  const handleViewImage = (index: number) => {
    setCurrentImageIndex(index);
    setShowImageViewer(true);
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Notification Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Upload Area */}
      <div 
        className={`border-2 border-dashed rounded-xl p-8 text-center mb-6 ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        } transition-colors duration-200`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        
        {uploading ? (
          <div>
            <Loader className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {translations?.uploadingImages || 'Uploading Images...'}
            </h3>
            <p className="text-gray-500">{translations?.pleaseWait || 'Please wait while we process your images'}</p>
          </div>
        ) : (
          <div>
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {translations?.uploadGalleryImages || 'Upload Gallery Images'}
            </h3>
            <p className="text-gray-500 mb-2">{translations?.dragDropImages || 'Drag and drop your images here, or click to browse'}</p>
            <p className="text-sm text-gray-400">
              {translations?.acceptedFormats || 'Accepted formats:'} JPG, JPEG, PNG, GIF, WEBP (max 3MB)
            </p>
          </div>
        )}
      </div>
      
      {/* Gallery Grid */}
      {galleryImages.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {galleryImages.map((imageUrl, index) => (
            <div key={index} className="relative group rounded-xl overflow-hidden bg-gray-100 aspect-square">
              <img 
                src={imageUrl} 
                alt={`Gallery ${index + 1}`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewImage(index);
                    }}
                    className="p-2 bg-white rounded-full text-gray-800 hover:text-blue-600 transition-colors duration-200"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteImage(imageUrl);
                    }}
                    className="p-2 bg-white rounded-full text-gray-800 hover:text-red-600 transition-colors duration-200"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Image className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {translations?.noGalleryImages || 'No Gallery Images'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {translations?.addImagesToShowcase || 'Add images to showcase your company, properties, or projects to potential customers.'}
          </p>
        </div>
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && (
        <ImageViewer
          images={galleryImages}
          currentIndex={currentImageIndex}
          setCurrentIndex={setCurrentImageIndex}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </div>
  );
};

export default GalleryTab;