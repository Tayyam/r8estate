import React, { useState, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Company } from '../../types/company';
import { Building2, Mail, Phone, Globe, MapPin, Camera, Upload, Save, Loader, AlertCircle, CheckCircle } from 'lucide-react';

interface ProfileManagementTabProps {
  company: Company;
  setCompany: (company: Company) => void;
}

const ProfileManagementTab: React.FC<ProfileManagementTabProps> = ({ company, setCompany }) => {
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: company.name,
    description: company.description || '',
    phone: company.phone || '',
    website: company.website || ''
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Handle form input change
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

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

  // Handle logo file change
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError(translations?.invalidFileType || 'Invalid file type. Please upload an image file (JPEG, PNG, GIF, WEBP)');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError(translations?.fileTooLarge || 'File size too large. Please upload an image under 5MB');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // Handle cover file change
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError(translations?.invalidFileType || 'Invalid file type. Please upload an image file (JPEG, PNG, GIF, WEBP)');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError(translations?.fileTooLarge || 'File size too large. Please upload an image under 5MB');
        setTimeout(() => setError(''), 3000);
        return;
      }
      
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const updateData: Partial<Company> = {
        name: formData.name,
        description: formData.description,
        phone: formData.phone,
        website: formData.website,
        updatedAt: new Date()
      };
      
      // Upload logo if selected
      if (logoFile) {
        // Delete old logo if exists
        if (company.logoUrl) {
          await deleteImage(company.logoUrl);
        }
        
        const logoUrl = await uploadImage(logoFile, `company-logos/${company.id}`);
        updateData.logoUrl = logoUrl;
      }
      
      // Upload cover if selected
      if (coverFile) {
        // Delete old cover if exists
        if (company.coverImageUrl) {
          await deleteImage(company.coverImageUrl);
        }
        
        const coverUrl = await uploadImage(coverFile, `company-covers/${company.id}`);
        updateData.coverImageUrl = coverUrl;
      }
      
      // Update company in Firestore
      await updateDoc(doc(db, 'companies', company.id), updateData);
      
      // Update local state
      setCompany({
        ...company,
        ...updateData,
        logoUrl: logoFile ? (updateData.logoUrl as string) : company.logoUrl,
        coverImageUrl: coverFile ? (updateData.coverImageUrl as string) : company.coverImageUrl
      });
      
      setSuccess(translations?.profileUpdatedSuccess || 'Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
      
      // Reset file inputs
      setLogoFile(null);
      setCoverFile(null);
      setLogoPreview(null);
      setCoverPreview(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(translations?.failedToUpdateProfile || 'Failed to update profile');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Notification Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSubmit}>
        {/* Image Upload Section */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {translations?.companyImages || 'Company Images'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.companyLogo || 'Company Logo'}
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-24 h-24 relative rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                  ) : company.logoUrl ? (
                    <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="h-10 w-10 text-gray-300" />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={logoInputRef}
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {company.logoUrl ? translations?.changeLogo || 'Change Logo' : translations?.uploadLogo || 'Upload Logo'}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    {translations?.recommendedSize || 'Recommended size: 400x400px'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.coverImage || 'Cover Image'}
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-40 h-24 relative rounded-lg border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                  ) : company.coverImageUrl ? (
                    <img src={company.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center">
                      <Building2 className="h-10 w-10 text-gray-300" />
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={coverInputRef}
                    onChange={handleCoverChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {company.coverImageUrl ? translations?.changeCover || 'Change Cover' : translations?.uploadCover || 'Upload Cover'}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    {translations?.recommendedCoverSize || 'Recommended size: 1200x400px'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {translations?.companyInformation || 'Company Information'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.companyName || 'Company Name'} *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={translations?.enterCompanyName || 'Enter company name'}
                />
              </div>
            </div>

            {/* Email (Read Only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.companyEmail || 'Company Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={company.email}
                  readOnly
                  disabled
                  className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {translations?.emailCannotBeChanged || 'Email address cannot be changed'}
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.companyPhone || 'Phone'}
              </label>
              <div className="relative">
                <Phone className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={translations?.enterPhone || 'Enter phone number'}
                />
              </div>
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.companyWebsite || 'Website'}
              </label>
              <div className="relative">
                <Globe className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={translations?.enterWebsite || 'Enter website URL'}
                />
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.companyDescription || 'Description'}
              </label>
              <textarea
                rows={5}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={translations?.enterDescription || 'Enter company description'}
              />
              <p className="mt-1 text-xs text-gray-500">
                {translations?.descriptionInfo || 'This description will be displayed on your public profile'}
              </p>
            </div>
          </div>
        </div>

        {/* Location Information (Read Only) */}
        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {translations?.locationInformation || 'Location Information'}
          </h2>
          
          <div className="relative">
            <MapPin className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={company.location}
              readOnly
              disabled
              className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {translations?.contactAdminLocation || 'Contact an administrator to change your company location'}
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? (
              <>
                <Loader className="animate-spin h-4 w-4 mr-2" />
                {translations?.saving || 'Saving...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {translations?.saveChanges || 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileManagementTab;