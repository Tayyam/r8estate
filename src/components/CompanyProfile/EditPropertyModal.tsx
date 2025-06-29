import React, { useState } from 'react';
import { Edit, X, Upload, Trash2, Building2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Property } from '../../types/property';

interface EditPropertyModalProps {
  property: Property;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

const EditPropertyModal: React.FC<EditPropertyModalProps> = ({
  property,
  onClose,
  onSuccess,
  onError
}) => {
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: property.name,
    description: property.description,
    descriptionAr: property.descriptionAr || '',
    area: property.area.toString(),
    location: property.location,
    locationAr: property.locationAr || '',
    projectName: property.projectName,
    projectNameAr: property.projectNameAr || '',
    price: property.price?.toString() || '',
    propertyType: property.propertyType,
    status: property.status,
    images: property.images,
    newImages: [] as File[]
  });

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

  // Handle removing existing image
  const handleRemoveImage = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img !== imageUrl)
    }));
  };

  // Handle adding new images
  const handleNewImages = (files: FileList) => {
    const newImages = Array.from(files).slice(0, 10 - formData.images.length);
    setFormData(prev => ({
      ...prev,
      newImages: newImages
    }));
  };

  // Get property type translation
  const getPropertyTypeTranslation = (type: string) => {
    switch (type) {
      case 'apartment':
        return translations?.apartment || 'Apartment';
      case 'villa':
        return translations?.villa || 'Villa';
      case 'commercial':
        return translations?.commercial || 'Commercial';
      case 'land':
        return translations?.land || 'Land';
      case 'office':
        return translations?.office || 'Office';
      default:
        return type;
    }
  };

  // Get status translation
  const getStatusTranslation = (status: string) => {
    switch (status) {
      case 'available':
        return translations?.available || 'Available';
      case 'sold':
        return translations?.sold || 'Sold';
      case 'reserved':
        return translations?.reserved || 'Reserved';
      default:
        return status;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      
      // Upload new images
      const uploadedImageUrls: string[] = [];
      for (const file of formData.newImages) {
        const imageUrl = await uploadImage(file, `property-images/${property.companyId}`);
        uploadedImageUrls.push(imageUrl);
      }

      // Combine existing and new images
      const allImages = [...formData.images, ...uploadedImageUrls];

      // Update property document
      await updateDoc(doc(db, 'properties', property.id), {
        name: formData.name,
        description: formData.description,
        descriptionAr: formData.descriptionAr || '',
        area: parseInt(formData.area),
        location: formData.location,
        locationAr: formData.locationAr || '',
        projectName: formData.projectName,
        projectNameAr: formData.projectNameAr || '',
        price: formData.price ? parseFloat(formData.price) : null,
        propertyType: formData.propertyType,
        status: formData.status,
        images: allImages,
        updatedAt: new Date()
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating property:', error);
      onError(translations?.failedToUpdateProperty || 'Failed to update property');
    } finally {
      setLoading(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Edit className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{translations?.editProperty || 'Edit Property'}</h3>
              <p className="text-sm text-gray-600">{translations?.updatePropertyInfo || 'Update property information'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Property Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.propertyName || 'Property Name'} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder={translations?.enterPropertyName || 'Enter property name'}
              />
            </div>
            
            {/* Property Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.propertyType || 'Property Type'} *
              </label>
              <select
                required
                value={formData.propertyType}
                onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as Property['propertyType'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              >
                <option value="apartment">{translations?.apartment || 'Apartment'}</option>
                <option value="villa">{translations?.villa || 'Villa'}</option>
                <option value="commercial">{translations?.commercial || 'Commercial'}</option>
                <option value="land">{translations?.land || 'Land'}</option>
                <option value="office">{translations?.office || 'Office'}</option>
              </select>
            </div>
            
            {/* Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.areaSquareMeters || 'Area (m²)'} *
              </label>
              <input
                type="number"
                required
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder={translations?.enterAreaInSquareMeters || 'Enter area in square meters'}
              />
            </div>
            
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.status || 'Status'} *
              </label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Property['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              >
                <option value="available">{translations?.available || 'Available'}</option>
                <option value="sold">{translations?.sold || 'Sold'}</option>
                <option value="reserved">{translations?.reserved || 'Reserved'}</option>
              </select>
            </div>
            
            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.locationField || 'Location'} *
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder={translations?.enterLocation || 'Enter location'}
              />
            </div>
            
            {/* Location Arabic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.locationArabic || 'Location (Arabic)'}
              </label>
              <input
                type="text"
                value={formData.locationAr}
                onChange={(e) => setFormData({ ...formData, locationAr: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder={translations?.enterLocationArabic || 'أدخل الموقع بالعربية'}
              />
            </div>
            
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.projectName || 'Project Name'} *
              </label>
              <input
                type="text"
                required
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder={translations?.enterProjectName || 'Enter project name'}
              />
            </div>
            
            {/* Project Name Arabic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.projectNameArabic || 'Project Name (Arabic)'}
              </label>
              <input
                type="text"
                value={formData.projectNameAr}
                onChange={(e) => setFormData({ ...formData, projectNameAr: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder={translations?.enterProjectNameArabic || 'أدخل اسم المشروع بالعربية'}
              />
            </div>
            
            {/* Price */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.priceEGP || 'Price (EGP)'}
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder={translations?.enterPriceOptional || 'Enter price (optional)'}
              />
            </div>
            
            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.description || 'Description'} *
              </label>
              <textarea
                required
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder={translations?.enterPropertyDescription || 'Enter property description'}
              />
            </div>
            
            {/* Description Arabic */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.descriptionArabic || 'Description (Arabic)'}
              </label>
              <textarea
                rows={3}
                value={formData.descriptionAr}
                onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                placeholder={translations?.enterPropertyDescriptionArabic || 'أدخل وصف العقار بالعربية'}
              />
            </div>

            {/* Current Images */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.currentImages || 'Current Images'}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.images.map((imageUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={imageUrl}
                      alt={`${translations?.property || 'Property'} ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(imageUrl)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Add New Images */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.addNewImages?.replace('{count}', (10 - formData.images.length).toString()) || 
                 `Add New Images (Max ${10 - formData.images.length} more)`}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    handleNewImages(e.target.files);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                disabled={formData.images.length >= 10}
              />
              {formData.newImages.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {translations?.newImagesSelected?.replace('{count}', formData.newImages.length.toString()) || 
                   `${formData.newImages.length} new image(s) selected`}
                </p>
              )}
            </div>
          </div>
          
          {/* Submit Buttons */}
          <div className="flex space-x-4 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-orange-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-orange-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{translations?.updatingProperty || 'Updating...'}</span>
                </>
              ) : (
                <>
                  <Edit className="h-5 w-5" />
                  <span>{translations?.updateProperty || 'Update Property'}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200 disabled:opacity-50"
            >
              {translations?.cancel || 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPropertyModal;