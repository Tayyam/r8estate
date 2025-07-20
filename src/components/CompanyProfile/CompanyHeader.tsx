import React, { useRef } from 'react';
import { ArrowLeft, Building2, MapPin, Globe, Phone, Mail, Star, Calendar , Camera } from 'lucide-react';
import TrustpilotStars from '../UI/TrustpilotStars';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import { Property } from '../../types/property';
import { Review } from '../../types/property';
import { Category, egyptianGovernorates } from '../../types/company';

interface CompanyHeaderProps {
  company: CompanyProfileType;
  setCompany: (company: CompanyProfileType) => void;
  properties: Property[];
  reviews: Review[];
  categories: Category[];
  canEdit: boolean;
  uploadLoading: boolean;
  setUploadLoading: (loading: boolean) => void;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
  onNavigateBack: () => void;
}

const CompanyHeader: React.FC<CompanyHeaderProps> = ({
  company,
  setCompany,
  properties,
  reviews,
  categories,
  canEdit,
  uploadLoading,
  setUploadLoading,
  setSuccess,
  setError,
  onNavigateBack
}) => {
  const { translations } = useLanguage();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    if (!canEdit) return;

    try {
      setUploadLoading(true);
      
      // Delete old logo if exists
      if (company.logoUrl) {
        await deleteImage(company.logoUrl);
      }

      // Upload new logo
      const logoUrl = await uploadImage(file, `company-logos/${company.id}`);
      
      // Update company document
      await updateDoc(doc(db, 'companies', company.id), {
        logoUrl: logoUrl,
        updatedAt: new Date()
      });

      setCompany({ ...company, logoUrl });
      setSuccess(translations?.logoUpdatedSuccess || 'Logo updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error uploading logo:', error);
      setError(translations?.failedToUploadLogo || 'Failed to upload logo');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUploadLoading(false);
    }
  };

  // Handle cover image upload
  const handleCoverUpload = async (file: File) => {
    if (!canEdit) return;

    try {
      setUploadLoading(true);
      
      // Delete old cover image if exists
      if (company.coverImageUrl) {
        await deleteImage(company.coverImageUrl);
      }

      // Upload new cover image
      const coverImageUrl = await uploadImage(file, `company-covers/${company.id}`);
      
      // Update company document
      await updateDoc(doc(db, 'companies', company.id), {
        coverImageUrl: coverImageUrl,
        updatedAt: new Date()
      });

      setCompany({ ...company, coverImageUrl });
      setSuccess(translations?.coverUpdatedSuccess || 'Cover image updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error uploading cover image:', error);
      setError(translations?.failedToUploadCover || 'Failed to upload cover image');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUploadLoading(false);
    }
  };

  // Get category name
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  // Get governorate name
  const getGovernorateName = (governorateId: string) => {
    const governorate = egyptianGovernorates.find(gov => gov.id === governorateId);
    return governorate ? governorate.name : governorateId;
  };

  // Calculate real-time average rating
  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10; // Round to 1 decimal place
  };

  const averageRating = calculateAverageRating();

  return (
    <>
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={onNavigateBack}
            className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-800 transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{translations?.backToCompanies || 'Back to Companies'}</span>
          </button>
        </div>
      </div>

      {/* Cover Image Section */}
      <div className="relative h-64 bg-gradient-to-r from-blue-500 to-purple-600 overflow-hidden">
        {company.coverImageUrl ? (
          <img
            src={company.coverImageUrl}
            alt={translations?.companyCoverImage || 'Company Cover'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <div className="text-center text-white">
              <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg opacity-75">{translations?.companyCoverImage || 'Company Cover Image'}</p>
            </div>
          </div>
        )}
        
        {canEdit && (
          <div className="absolute top-4 right-4">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleCoverUpload(e.target.files[0]);
                }
              }}
              className="hidden"
            />
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadLoading}
              className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-white/90 hover:bg-white text-gray-800 rounded-lg transition-all duration-200 shadow-lg"
            >
              {uploadLoading ? (
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Camera className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">{translations?.changeCover || 'Change Cover'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Company Info Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-16 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Logo */}
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-white">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={company.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <Building2 className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>
                
                {canEdit && (
                  <div className="absolute -bottom-2 -right-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleLogoUpload(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadLoading}
                      className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200"
                    >
                      {uploadLoading ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Camera className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Company Details */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{company.name}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1 rtl:space-x-reverse">
                        <Building2 className="h-4 w-4" />
                        <span>{getCategoryName(company.categoryId)}</span>
                      </div>
                      <div className="flex items-center space-x-1 rtl:space-x-reverse">
                        <MapPin className="h-4 w-4" />
                        <span>{getGovernorateName(company.location)}</span>
                      </div>
                      {company.establishmentDate && (
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <Calendar className="h-4 w-4" />
                          <span>{translations?.established || 'Est.'} {company.establishmentDate}</span>
                        </div>
                      )}
                      {company.website && (
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <Globe className="h-4 w-4" />
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                            {translations?.website || 'Website'}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 rtl:space-x-reverse mt-4 sm:mt-0">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
                      {/* Properties Card */}
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-900 mb-1">{properties.length}</div>
                          <div className="text-sm font-medium text-blue-700">{translations?.properties || 'Properties'}</div>
                        </div>
                      </div>
                      
                      {/* Reviews Card */}
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-900 mb-1">{reviews.length}</div>
                          <div className="text-sm font-medium text-green-700">{translations?.reviews || 'Reviews'}</div>
                        </div>
                      </div>
                      
                      {/* Rating Card - Featured */}
                      <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-xl p-4 border-2 border-yellow-300 shadow-lg">
                        <div className="text-center">
                          <div className="flex justify-center mb-2">
                            <TrustpilotStars rating={averageRating} size="medium" />
                          </div>
                          <div className="text-lg font-bold text-orange-900 mb-1">
                            {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
                          </div>
                          <div className="text-xs font-medium text-orange-700">{translations?.averageRating || 'Average Rating'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CompanyHeader;