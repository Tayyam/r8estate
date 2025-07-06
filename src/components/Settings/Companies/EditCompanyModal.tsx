import React, { useState, useRef, useEffect } from 'react';
import { Edit, Building2, Mail, Phone, Globe, MapPin, Upload, X } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Company, Category, egyptianGovernorates } from '../../../types/company';

interface EditCompanyModalProps {
  company: Company;
  categories: Category[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const EditCompanyModal: React.FC<EditCompanyModalProps> = ({
  company,
  categories,
  onClose,
  onSuccess,
  onError
}) => {
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: company.name,
    categoryId: company.categoryId,
    location: company.location,
    description: company.description || '',
    phone: company.phone || '',
    website: company.website || '',
    claimed: true // Always set to true
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(company.logoUrl || null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle form input changes
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  // Handle logo file selection
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        onError(translations?.invalidFileType || 'Invalid file type. Please upload an image file (JPEG, PNG, or GIF)');
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        onError(translations?.fileTooLarge || 'File size too large. Please upload an image under 5MB');
        return;
      }
      
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setRemoveLogo(false);
    }
  };

  // Handle remove logo
  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload logo to Firebase Storage
  const uploadLogo = async (file: File, companyId: string): Promise<string> => {
    // Create a unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${companyId}_${timestamp}.${fileExtension}`;
    
    // Create a reference to the file location
    const storageRef = ref(storage, `company-logos/${fileName}`);
    
    // Upload file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  };

  // Delete logo from Firebase Storage
  const deleteLogo = async (logoUrl: string) => {
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name || !formData.categoryId || !formData.location) {
      onError(translations?.fillAllFields || 'Please fill in all required fields');
      return;
    }
    
    // Validate website URL if provided
    if (formData.website && !formData.website.startsWith('http://') && !formData.website.startsWith('https://')) {
      setFormData({
        ...formData,
        website: `https://${formData.website}`
      });
    }
    
    try {
      setLoading(true);
      
      // Update company document in Firestore
      const companyRef = doc(db, 'companies', company.id);
      
      const updateData: any = {
        name: formData.name,
        categoryId: formData.categoryId,
        location: formData.location,
        description: formData.description,
        phone: formData.phone,
        website: formData.website,
        claimed: formData.claimed,
        updatedAt: new Date()
      };
      
      // Handle logo changes
      if (logoFile) {
        // Delete old logo if exists
        if (company.logoUrl) {
          await deleteLogo(company.logoUrl);
        }
        
        // Upload new logo
        const logoUrl = await uploadLogo(logoFile, company.id);
        updateData.logoUrl = logoUrl;
      } else if (removeLogo) {
        // Remove logo field and delete from storage
        if (company.logoUrl) {
          await deleteLogo(company.logoUrl);
        }
        updateData.logoUrl = null;
      }
      
      await updateDoc(companyRef, updateData);
      
      onSuccess(translations?.companyUpdatedSuccess || 'Company updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating company:', error);
      onError(translations?.failedToUpdateCompany || 'Failed to update company');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup URL objects on component unmount
  useEffect(() => {
    return () => {
      if (logoPreview && logoFile) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview, logoFile]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Edit className="h-5 w-5 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {translations?.editCompany || 'Edit Company'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
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
                  className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.companyCategory || 'Category'} *
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="">{translations?.selectCategory || 'Select category'}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.nameAr || category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.companyLocation || 'Location'} *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  required
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">{translations?.selectLocation || 'Select location'}</option>
                  {egyptianGovernorates.map((governorate) => (
                    <option key={governorate.id} value={governorate.id}>
                      {governorate.nameAr || governorate.name}
                    </option>
                  ))}
                </select>
              </div>
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
                  className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                  className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
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
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder={translations?.enterDescription || 'Enter company description'}
              />
            </div>

            {/* Logo Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.companyLogo || 'Company Logo'}
              </label>
              
              <div className="mt-1 bg-gray-50 border border-gray-200 rounded-lg p-6">
                {/* Current Logo Display */}
                {!removeLogo && company.logoUrl && !logoFile && (
                  <div className="mb-4 flex flex-col items-center">
                    <p className="text-sm text-gray-600 mb-2">{translations?.currentLogo || 'Current Logo'}</p>
                    <div className="relative">
                      <img
                        src={company.logoUrl}
                        alt={company.name}
                        className="h-32 w-32 object-contain bg-white rounded-lg border border-gray-200 p-2"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors duration-200"
                        title={translations?.removeLogo || "Remove Logo"}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Logo Upload Section */}
                <div 
                  className={`mt-2 border-2 border-dashed border-gray-300 rounded-lg p-4 flex justify-center items-center flex-col cursor-pointer hover:bg-gray-50 ${
                    !removeLogo && company.logoUrl && !logoFile ? 'mt-4' : ''
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleLogoSelect}
                  />
                  
                  {logoFile ? (
                    <div className="text-center">
                      <div className="mb-3">
                        <img
                          src={logoPreview || ''}
                          alt="Logo preview"
                          className="h-32 w-32 object-contain mx-auto"
                        />
                      </div>
                      <div className="flex items-center justify-center">
                        <span className="text-sm text-gray-600 mr-2">{logoFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogoFile(null);
                            setLogoPreview(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <div className="text-gray-600 text-sm">
                        {!company.logoUrl || removeLogo
                          ? (translations?.uploadLogo || 'Upload a new logo')
                          : (translations?.changeLogo || 'Change logo')}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {translations?.allowedFormats || 'Allowed formats: PNG, JPG, GIF'} ({translations?.maxFileSize || 'Max 5MB'})
                      </p>
                    </div>
                  )}
                </div>
                
                {removeLogo && company.logoUrl && (
                  <div className="mt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setRemoveLogo(false)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {translations?.undoRemoveLogo || 'Undo remove logo'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end space-x-3 rtl:space-x-reverse">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {translations?.cancel || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 flex items-center space-x-2 rtl:space-x-reverse"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{loading ? (translations?.updatingCompany || 'Updating...') : (translations?.updateCompany || 'Update Company')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCompanyModal;