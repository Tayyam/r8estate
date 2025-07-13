import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import { Category, egyptianGovernorates } from '../../types/company';
import PhotoGallery from './PhotoGallery';
import ContactInfo from './ContactInfo';
import ClaimRequestModal from './ClaimRequestModal';
import TrackingModal from './ClaimRequestModal/TrackingModal';
import { Building2, CheckCircle } from 'lucide-react';

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
  const { translations } = useLanguage();
  const { currentUser } = useAuth();
  const [showClaimRequestModal, setShowClaimRequestModal] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Get governorate name
  const getGovernorateName = (governorateId: string) => {
    const governorate = egyptianGovernorates.find(gov => gov.id === governorateId);
    return governorate ? governorate.name : governorateId;
  };

  // Check if current user is owner or admin
  const isOwnerOrAdmin = canEdit;

  // Check if company is already claimed
  const isClaimed = company.claimed;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Company Info */}
      <div className="lg:col-span-2 space-y-8">
        {/* About Company */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {translations?.aboutCompany || 'About Company'}
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {company.description || (translations?.noDescriptionAvailable || 'No description available.')}
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

        {/* Verification Badge - for claimed companies */}
        {isClaimed && !isOwnerOrAdmin && (
          <div className="bg-white rounded-2xl shadow-md p-6 border border-green-200">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 flex items-center space-x-2 rtl:space-x-reverse">
                  <span className="text-green-600">{translations?.verified || 'Verified'}</span>
                  <span className="text-gray-600 text-sm">• {translations?.officialAccount || 'Official Account'}</span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {translations?.verifiedCompanyExplanation || 
                  'This is an official company account verified by R8 ESTATE.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Claim Company Button - for unclaimed companies */}
        {!isClaimed && !isOwnerOrAdmin && (
          <div className="bg-white rounded-2xl shadow-md p-6 border-l-4 border-blue-500">
            {localStorage.getItem('claimTrackingNumber') ? (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {translations?.trackClaimRequest || 'Track Your Claim Request'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {translations?.checkRequestStatus || 'Check the status of your claim request for this company'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    // Just open the tracking modal directly
                    setShowClaimRequestModal(true);
                    setEditMode(false);
                    // Reset edit mode
                    setEditMode(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium"
                >
                  {translations?.trackRequest || 'Track Request'}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {editMode 
                      ? (translations?.editClaimRequest || 'Edit Claim Request') 
                      : (translations?.claimCompany || 'Claim Company')}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {translations?.claimCompanyExplanation || 'Is this your company? Claim ownership to manage your profile and respond to reviews.'}
                  </p>
                </div>
                <button
                  onClick={() => setShowClaimRequestModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium"
                >
                  {translations?.claimCompany || 'Claim Company'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Claim Request Modal */}
      {showClaimRequestModal && (
        localStorage.getItem('claimTrackingNumber') ? (
          editMode ? (
            <ClaimRequestModal
              company={company}
              onClose={() => setShowClaimRequestModal(false)}
              onSuccess={setSuccess}
              onError={setError}
            />
          ) : (
            <TrackingModal
              initialTrackingNumber={localStorage.getItem('claimTrackingNumber') || ''}
              onClose={() => setShowClaimRequestModal(false)}
              onEditRequest={() => {
                setEditMode(true);
                setShowClaimRequestModal(true);
              }}
              translations={translations}
            />
          )
        ) : (
          <ClaimRequestModal
            company={company}
            onClose={() => setShowClaimRequestModal(false)}
            onSuccess={setSuccess}
            onError={setError}
          />
        )
      )}
    </div>
  );
};

export default OverviewTab;