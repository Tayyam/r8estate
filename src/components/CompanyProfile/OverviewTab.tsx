import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import { Category, egyptianGovernorates } from '../../types/company';
import PhotoGallery from './PhotoGallery';
import ContactInfo from './ContactInfo';
import ClaimRequestModal from './ClaimRequestModal';
import { Building2, AlertCircle } from 'lucide-react';

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

  // Get governorate name
  const getGovernorateName = (governorateId: string) => {
    const governorate = egyptianGovernorates.find(gov => gov.id === governorateId);
    return governorate ? governorate.name : governorateId;
  };

  // Check if current user is owner or admin
  const isOwnerOrAdmin = canEdit;

  // Check if company is already claimed
  const isClaimed = company.claimed;

  // Show claim button only for non-admin regular users and unclaimed companies
  const showClaimButton = 
    currentUser && 
    currentUser.role === 'user' && 
    !isOwnerOrAdmin && 
    !isClaimed;

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

        {/* Claim Request Button - for regular users, non-admins/owners and for unclaimed companies */}
        {showClaimButton && (
          <div className="bg-blue-50 rounded-2xl shadow-md p-6 border border-blue-100">
            <div className="flex items-start space-x-4 rtl:space-x-reverse">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-blue-800 mb-2">
                  {translations?.isThisYourCompany || 'Is this your company?'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {translations?.claimCompanyExplanation || 
                  'If you are the owner or representative of this company, you can request to claim this profile and manage it directly.'}
                </p>
                <button
                  onClick={() => setShowClaimRequestModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {translations?.sendClaimRequest || 'Send Claim Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Already Claimed Notice */}
        {currentUser && !isOwnerOrAdmin && isClaimed && (
          <div className="bg-gray-50 rounded-2xl shadow-md p-6 border border-gray-200">
            <div className="flex items-start space-x-4 rtl:space-x-reverse">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-gray-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-700 mb-2">
                  {translations?.companyAlreadyClaimed || 'Company Already Claimed'}
                </h3>
                <p className="text-gray-600">
                  {translations?.claimedCompanyExplanation || 
                  'This company profile has already been claimed and is being managed by the company owner or representative.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Contact & Stats */}
      <div className="space-y-8">
        <ContactInfo 
          company={company} 
          getGovernorateName={getGovernorateName}
        />
      </div>

      {/* Claim Request Modal */}
      {showClaimRequestModal && (
        <ClaimRequestModal
          company={company}
          onClose={() => setShowClaimRequestModal(false)}
          onSuccess={setSuccess}
          onError={setError}
        />
      )}
    </div>
  );
};

export default OverviewTab;