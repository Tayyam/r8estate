import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import { Property } from '../../types/property';

interface AddPropertyModalProps {
  company: CompanyProfileType;
  setShowAddProperty: (show: boolean) => void;
  uploadLoading: boolean;
  setUploadLoading: (loading: boolean) => void;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
  loadCompanyData: () => void;
}

const AddPropertyModal: React.FC<AddPropertyModalProps> = ({
  company,
  setShowAddProperty,
  uploadLoading,
  setUploadLoading,
  setSuccess,
  setError,
  loadCompanyData
}) => {
  const { translations } = useLanguage();
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    description: '',
    descriptionAr: '',
    area: '',
    location: '',
    locationAr: '',
    projectName: '',
    projectNameAr: '',
    price: '',
    propertyType: 'apartment' as Property['propertyType'],
    status: 'available' as Property['status'],
    images: [] as File[]
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

  // Handle property form submission
  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setUploadLoading(true);
      
      // Upload property images
      const imageUrls: string[] = [];
      for (const file of propertyForm.images) {
        const imageUrl = await uploadImage(file, `property-images/${company.id}`);
        imageUrls.push(imageUrl);
      }

      // Create property document
      await addDoc(collection(db, 'properties'), {
        companyId: company.id,
        name: propertyForm.name,
        description: propertyForm.description,
        descriptionAr: propertyForm.descriptionAr || '',
        area: parseInt(propertyForm.area),
        location: propertyForm.location,
        locationAr: propertyForm.locationAr || '',
        projectName: propertyForm.projectName,
        projectNameAr: propertyForm.projectNameAr || '',
        price: propertyForm.price ? parseFloat(propertyForm.price) : null,
        propertyType: propertyForm.propertyType,
        status: propertyForm.status,
        images: imageUrls,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Reset form
      setPropertyForm({
        name: '',
        description: '',
        descriptionAr: '',
        area: '',
        location: '',
        locationAr: '',
        projectName: '',
        projectNameAr: '',
        price: '',
        propertyType: 'apartment',
        status: 'available',
        images: []
      });

      setShowAddProperty(false);
      setSuccess(translations?.propertyAddedSuccess || 'Property added successfully');
      setTimeout(() => setSuccess(''), 3000);
      
      // Reload properties
      loadCompanyData();
    } catch (error) {
      console.error('Error adding property:', error);
      setError(translations?.failedToAddProperty || 'Failed to add property');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUploadLoading(false);
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-screen overflow-y-auto">
        <h3 className="text-2xl font-bold mb-8" style={{ color: '#194866' }}>
          {translations?.addNewProperty || 'Add New Property'}
        </h3>
        
        <form onSubmit={handleAddProperty} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.propertyName || 'Property Name'} *
              </label>
              <input
                type="text"
                required
                value={propertyForm.name}
                onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder={translations?.enterPropertyName || 'Enter property name'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.propertyType || 'Property Type'} *
              </label>
              <select
                required
                value={propertyForm.propertyType}
                onChange={(e) => setPropertyForm({ ...propertyForm, propertyType: e.target.value as Property['propertyType'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="apartment">{translations?.apartment || 'Apartment'}</option>
                <option value="villa">{translations?.villa || 'Villa'}</option>
                <option value="commercial">{translations?.commercial || 'Commercial'}</option>
                <option value="land">{translations?.land || 'Land'}</option>
                <option value="office">{translations?.office || 'Office'}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.areaSquareMeters || 'Area (m²)'} *
              </label>
              <input
                type="number"
                required
                value={propertyForm.area}
                onChange={(e) => setPropertyForm({ ...propertyForm, area: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder={translations?.enterAreaInSquareMeters || 'Enter area in square meters'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.status || 'Status'} *
              </label>
              <select
                required
                value={propertyForm.status}
                onChange={(e) => setPropertyForm({ ...propertyForm, status: e.target.value as Property['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="available">{translations?.available || 'Available'}</option>
                <option value="sold">{translations?.sold || 'Sold'}</option>
                <option value="reserved">{translations?.reserved || 'Reserved'}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.locationField || 'Location'} *
              </label>
              <input
                type="text"
                required
                value={propertyForm.location}
                onChange={(e) => setPropertyForm({ ...propertyForm, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder={translations?.enterLocation || 'Enter location'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.locationArabic || 'Location (Arabic)'}
              </label>
              <input
                type="text"
                value={propertyForm.locationAr}
                onChange={(e) => setPropertyForm({ ...propertyForm, locationAr: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder={translations?.enterLocationArabic || 'أدخل الموقع بالعربية'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.projectName || 'Project Name'} *
              </label>
              <input
                type="text"
                required
                value={propertyForm.projectName}
                onChange={(e) => setPropertyForm({ ...propertyForm, projectName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder={translations?.enterProjectName || 'Enter project name'}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.projectNameArabic || 'Project Name (Arabic)'}
              </label>
              <input
                type="text"
                value={propertyForm.projectNameAr}
                onChange={(e) => setPropertyForm({ ...propertyForm, projectNameAr: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder={translations?.enterProjectNameArabic || 'أدخل اسم المشروع بالعربية'}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.priceEGP || 'Price (EGP)'}
              </label>
              <input
                type="number"
                value={propertyForm.price}
                onChange={(e) => setPropertyForm({ ...propertyForm, price: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder={translations?.enterPriceOptional || 'Enter price (optional)'}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.description || 'Description'} *
              </label>
              <textarea
                required
                rows={3}
                value={propertyForm.description}
                onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder={translations?.enterPropertyDescription || 'Enter property description'}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.descriptionArabic || 'Description (Arabic)'}
              </label>
              <textarea
                rows={3}
                value={propertyForm.descriptionAr}
                onChange={(e) => setPropertyForm({ ...propertyForm, descriptionAr: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder={translations?.enterPropertyDescriptionArabic || 'أدخل وصف العقار بالعربية'}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.propertyImages || 'Property Images'} * ({translations?.maxImages?.replace('{max}', '10') || 'Max 10 images'})
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                required
                onChange={(e) => {
                  if (e.target.files) {
                    const files = Array.from(e.target.files).slice(0, 10);
                    setPropertyForm({ ...propertyForm, images: files });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {propertyForm.images.length > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {translations?.imagesSelected?.replace('{count}', propertyForm.images.length.toString()) || 
                   `${propertyForm.images.length} image(s) selected`}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex space-x-4 pt-6">
            <button
              type="submit"
              disabled={uploadLoading}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
            >
              {uploadLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                translations?.addProperty || 'Add Property'
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowAddProperty(false)}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200"
            >
              {translations?.cancel || 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPropertyModal;