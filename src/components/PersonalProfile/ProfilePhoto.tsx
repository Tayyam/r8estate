import React, { useState, useRef } from 'react';
import { Camera, User } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface ProfilePhotoProps {
  setError: (message: string) => void;
  setSuccess: (message: string) => void;
}

const ProfilePhoto: React.FC<ProfilePhotoProps> = ({ setError, setSuccess }) => {
  const { currentUser, firebaseUser } = useAuth();
  const { translations } = useLanguage();
  const [photoLoading, setPhotoLoading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Compress image before upload
  const compressImage = (file: File, maxWidth: number = 400, quality: number = 0.8): Promise<File> => {
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

  // Delete old profile photo
  const deleteOldPhoto = async (photoURL: string) => {
    try {
      const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/r8estate-2a516.firebasestorage.app/o/';
      if (photoURL.startsWith(baseUrl)) {
        const filePath = decodeURIComponent(photoURL.replace(baseUrl, '').split('?')[0]);
        const storageRef = ref(storage, filePath);
        await deleteObject(storageRef);
      }
    } catch (error) {
      console.error('Error deleting old photo:', error);
    }
  };

  // Upload image to Firebase Storage
  const uploadProfilePhoto = async (file: File): Promise<string> => {
    try {
      const compressedFile = await compressImage(file);
      
      const timestamp = Date.now();
      const fileExtension = compressedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${currentUser?.uid}_${timestamp}.${fileExtension}`;
      const storageRef = ref(storage, `profile-photos/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError(translations?.invalidFileType || 'Invalid file type. Please upload an image file.');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(translations?.fileTooLarge || 'File size too large. Please upload an image under 5MB.');
      return;
    }

    try {
      setPhotoLoading(true);
      
      // Delete old photo if exists
      if (firebaseUser.photoURL) {
        await deleteOldPhoto(firebaseUser.photoURL);
      }

      // Upload new photo
      const photoURL = await uploadProfilePhoto(file);
      
      // Update Firebase profile
      await updateProfile(firebaseUser, { photoURL });
      
      // Update Firestore document
      if (currentUser) {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          photoURL: photoURL,
          updatedAt: new Date()
        });
      }

      setSuccess(translations?.photoUpdatedSuccess || 'Profile photo updated successfully');
    } catch (error: any) {
      console.error('Error updating photo:', error);
      setError(translations?.failedToUpdatePhoto || 'Failed to update profile photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 transition-all duration-300 hover:shadow-xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3 rtl:space-x-reverse">
        <Camera className="h-6 w-6" style={{ color: '#194866' }} />
        <span>{translations?.profilePhoto || 'Profile Photo'}</span>
      </h2>
      
      <div className="flex flex-col sm:flex-row items-center space-y-6 sm:space-y-0 sm:space-x-8 rtl:space-x-reverse">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden shadow-lg bg-gray-100 flex items-center justify-center border-4 border-white transition-transform duration-300 group-hover:scale-105">
            {firebaseUser?.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={currentUser?.displayName || ''}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                <User className="h-16 w-16 text-white" />
              </div>
            )}
          </div>
          
          {photoLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          <div className="absolute -bottom-3 inset-x-0 mx-auto flex justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={() => photoInputRef.current?.click()}
              disabled={photoLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg transition-all duration-200 flex items-center space-x-1 rtl:space-x-reverse"
            >
              <Camera className="h-3 w-3" />
              <span>{translations?.change || 'Change'}</span>
            </button>
          </div>
        </div>
        
        <div className="text-center sm:text-left flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {translations?.updateYourPhoto || 'Update Your Photo'}
          </h3>
          <p className="text-gray-600 leading-relaxed mb-4">
            {translations?.photoInstructions || 'Choose a clear photo that represents you professionally.'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {translations?.photoInstructionsDetails || 'Max size: 5MB. Formats: JPG, PNG, GIF, WebP'}
          </p>
          
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={photoLoading}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 text-white rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 transform hover:-translate-y-1"
            style={{ backgroundColor: '#194866' }}
          >
            {photoLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{translations?.uploadingPhoto || 'Uploading...'}</span>
              </>
            ) : (
              <>
                <Camera className="h-5 w-5" />
                <span>{translations?.changePhoto || 'Change Photo'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePhoto;