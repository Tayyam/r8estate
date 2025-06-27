import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

// Upload company logo to Firebase Storage
export const uploadCompanyLogo = async (file: File, companyId: string): Promise<string> => {
  try {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload an image file (JPEG, PNG, GIF, or WebP)');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      throw new Error('File size too large. Please upload an image under 5MB');
    }

    // Create a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${companyId}_${timestamp}.${fileExtension}`;
    
    // Create storage reference
    const storageRef = ref(storage, `company-logos/${fileName}`);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading logo:', error);
    throw error;
  }
};

// Delete logo from Firebase Storage
export const deleteCompanyLogo = async (logoUrl: string): Promise<void> => {
  try {
    // Extract file path from URL
    const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/r8estate-2a516.firebasestorage.app/o/';
    if (logoUrl.startsWith(baseUrl)) {
      const filePath = decodeURIComponent(logoUrl.replace(baseUrl, '').split('?')[0]);
      const storageRef = ref(storage, filePath);
      await deleteObject(storageRef);
    }
  } catch (error) {
    console.error('Error deleting logo:', error);
    // Don't throw error for delete operations as it might be already deleted
  }
};