import React, { useState, useRef } from 'react';
import { Plus, Building2, Mail, Phone, Globe, MapPin, Upload, X } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc, addDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Category, egyptianGovernorates } from '../../../types/company';

interface AddCompanyModalProps {
  categories: Category[];
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const AddCompanyModal: React.FC<AddCompanyModalProps> = ({
  categories,
  onClose,
  onSuccess,
  onError
}) => {
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    categoryId: '',
    location: '',
    description: '',
    phone: '',
    website: ''
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [createAccount, setCreateAccount] = useState(true); // Always create account (claimed)

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
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
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
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
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name || !formData.categoryId || !formData.location) {
      onError(translations?.fillAllRequiredFields || 'Please fill in all required fields');
      return;  
    }
    
    // Validate email and password
    if (!formData.email || !formData.password) {
      onError(translations?.emailPasswordRequired || 'Email and password are required');
      return;
    }
    
    // Validate password length
    if (formData.password.length < 6) {
      onError(translations?.passwordMinLength || 'Password must be at least 6 characters long');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      onError(translations?.invalidEmailFormat || 'Please enter a valid email address');
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
      
      let companyId: string;
      let companyData: any;
      
      // Create the user account with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      companyId = userCredential.user.uid;
      
      companyData = {
        id: companyId,
        name: formData.name,
        email: formData.email,
        categoryId: formData.categoryId,
        location: formData.location,
        description: formData.description || '',
        phone: formData.phone || '',
        website: formData.website || '',
        claimed: true, // Always set to true
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Create user document in users collection
      await setDoc(doc(db, 'users', companyId), {
        uid: companyId,
        email: formData.email,
        displayName: formData.name,
        role: 'company',
        companyId: companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isEmailVerified: false
      });
      
      // Create company document with matching UID
      await setDoc(doc(db, 'companies', companyId), companyData);
      
      // Upload logo if selected
      if (logoFile) {
        const logoUrl = await uploadLogo(logoFile, companyId);
        await updateDoc(doc(db, 'companies', companyId), {
          logoUrl: logoUrl
        });
      }
      
      onSuccess(translations?.companyCreatedSuccess || 'Company created successfully');
      onClose();
    } catch (error: any) {
      console.error('Error adding company:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        onError(translations?.emailAlreadyExists || 'Email address is already in use by another account');
      } else {
        onError(translations?.failedToCreateCompany || 'Failed to create company');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Plus className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {translations?.addNewCompany || 'Add New Company'}
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
          {/* Account Creation Toggle */}
          <div className="mb-6 border-b border-gray-200 pb-6"></div>

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

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.companyEmail || 'Company Email'} *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={translations?.enterCompanyEmail || 'Enter company email'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.companyPassword || 'Password'} *
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={translations?.enterCompanyPassword || 'Enter password (min. 6 characters)'}
                minLength={6}
              />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={translations?.enterDescription || 'Enter company description'}
              />
            </div>

            {/* Logo Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.companyLogo || 'Company Logo'}
              </label>
              <div 
                className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-6 flex justify-center items-center flex-col cursor-pointer hover:bg-gray-50"
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
                    <div className="mb-4">
                      <img
                        src={URL.createObjectURL(logoFile)}
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
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <div className="text-gray-600 text-sm">
                      {translations?.dragDropLogo || 'Drag and drop your logo here, or click to browse'}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {translations?.allowedFormats || 'Allowed formats: PNG, JPG, GIF'} ({translations?.maxFileSize || 'Max 5MB'})
                    </p>
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
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 rtl:space-x-reverse"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{loading ? (translations?.creatingCompany || 'Creating...') : (translations?.createCompany || 'Create Company')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCompanyModal;