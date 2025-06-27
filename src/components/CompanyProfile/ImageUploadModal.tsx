import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';

interface ImageUploadModalProps {
  company: CompanyProfileType;
  galleryImages: string[];
  setGalleryImages: (images: string[]) => void;
  setShowImageUpload: (show: boolean) => void;
  uploadLoading: boolean;
  setUploadLoading: (loading: boolean) => void;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  company,
  galleryImages,
  setGalleryImages,
  setShowImageUpload,
  uploadLoading,
  setUploadLoading,
  setSuccess,
  setError
}) => {
  const galleryInputRef = useRef<HTMLInputElement>(null);

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
  const uploadImage = async (file: File, path: string): Promise<string> => {
    try {
      const compressedFile = await compressImage(file);
      
      const timestamp = Date.now();
      const fileExtension = compressedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${timestamp}.${fileExtension}`;
      const storageRef = ref(storage, `${path}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  // Handle gallery images upload
  const handleGalleryUpload = async (files: FileList) => {
    try {
      setUploadLoading(true);
      const newImages: string[] = [];

      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const imageUrl = await uploadImage(file, `company-gallery/${company.id}`);
          newImages.push(imageUrl);
        }
      }

      if (newImages.length > 0) {
        const updatedGallery = [...galleryImages, ...newImages];
        
        // Update company document
        await updateDoc(doc(db, 'companies', company.id), {
          galleryImages: updatedGallery,
          updatedAt: new Date()
        });

        setGalleryImages(updatedGallery);
        setSuccess(`${newImages.length} image(s) added to gallery`);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error uploading gallery images:', error);
      setError('Failed to upload gallery images');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUploadLoading(false);
      setShowImageUpload(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-6" style={{ color: '#194866' }}>
          Add Gallery Images
        </h3>
        
        <div className="mb-6">
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleGalleryUpload(e.target.files);
              }
            }}
            className="hidden"
          />
          <button
            onClick={() => galleryInputRef.current?.click()}
            disabled={uploadLoading}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors duration-200"
          >
            {uploadLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-600">Uploading...</span>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Click to upload images</p>
                <p className="text-sm text-gray-500">You can select multiple images at once</p>
                <p className="text-xs text-gray-400 mt-2">Images will be automatically optimized</p>
              </>
            )}
          </button>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowImageUpload(false)}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModal;