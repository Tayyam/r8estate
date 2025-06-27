import React from 'react';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import { Category, egyptianGovernorates } from '../../types/company';
import PhotoGallery from './PhotoGallery';
import ContactInfo from './ContactInfo';
import Statistics from './Statistics';

interface OverviewTabProps {
  company: CompanyProfileType;
  galleryImages: string[];
  setGalleryImages: (images: string[]) => void;
  canEdit: boolean;
  setShowImageUpload: (show: boolean) => void;
  uploadLoading: boolean;
  setUploadLoading: (loading: boolean) => void;
  setSuccess: (message: string) => void;
  setError: (message: string) => void;
  categories: Category[];
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  company,
  galleryImages,
  setGalleryImages,
  canEdit,
  setShowImageUpload,
  uploadLoading,
  setUploadLoading,
  setSuccess,
  setError,
  categories
}) => {
  // Get governorate name
  const getGovernorateName = (governorateId: string) => {
    const governorate = egyptianGovernorates.find(gov => gov.id === governorateId);
    return governorate ? governorate.name : governorateId;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Company Info */}
      <div className="lg:col-span-2 space-y-8">
        {/* About Company */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">About Company</h2>
          <p className="text-gray-700 leading-relaxed">
            {company.description || 'No description available.'}
          </p>
        </div>

        {/* Photo Gallery */}
        <PhotoGallery
          galleryImages={galleryImages}
          setGalleryImages={setGalleryImages}
          canEdit={canEdit}
          setShowImageUpload={setShowImageUpload}
          uploadLoading={uploadLoading}
          setUploadLoading={setUploadLoading}
          setSuccess={setSuccess}
          setError={setError}
          company={company}
        />
      </div>

      {/* Right Column - Contact & Stats */}
      <div className="space-y-8">
        <ContactInfo 
          company={company} 
          getGovernorateName={getGovernorateName}
        />
        <Statistics company={company} />
      </div>
    </div>
  );
};

export default OverviewTab;