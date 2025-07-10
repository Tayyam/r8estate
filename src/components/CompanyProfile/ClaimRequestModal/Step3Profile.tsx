import React from 'react';
import { User, Camera } from 'lucide-react';

interface Step3ProfileProps {
  formData: {
    displayName: string;
  };
  handleInputChange: (field: string, value: string) => void;
  photoPreview: string | null;
  handlePhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  loading: boolean;
  hasDomainEmail: boolean | null;
  setCurrentStep: (step: number) => void;
  handleNextStep: () => void;
  translations: any;
}

const Step3Profile: React.FC<Step3ProfileProps> = ({
  formData,
  handleInputChange,
  photoPreview,
  handlePhotoSelect,
  fileInputRef,
  loading,
  hasDomainEmail,
  setCurrentStep,
  handleNextStep,
  translations
}) => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
          {translations?.fullName || 'Full Name'} *
        </label>
        <div className="relative">
          <User className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            id="displayName"
            type="text"
            required
            value={formData.displayName}
            onChange={(e) => handleInputChange('displayName', e.target.value)}
            className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={translations?.enterFullName || 'Enter your full name'}
          />
        </div>
      </div>
      
      {/* Profile Photo Upload (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {translations?.profilePhoto || 'Profile Photo'} ({translations?.optional || 'optional'})
        </label>
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
              ref={fileInputRef}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors duration-200"
            >
              <Camera className="h-4 w-4 inline mr-2" />
              {photoPreview ? 
                (translations?.changePhoto || 'Change Photo') : 
                (translations?.uploadPhoto || 'Upload Photo')
              }
            </button>
            <p className="text-xs text-gray-500 mt-1">
              {translations?.photoSizeLimit || 'Max 2MB. JPG, PNG or GIF'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep(2)}
          className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          {translations?.back || 'Back'}
        </button>
        
        <button
          type="button"
          onClick={handleNextStep}
          disabled={loading}
          className="px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 rtl:space-x-reverse"
        >
          {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {hasDomainEmail ? 
            <span>{translations?.continueToVerification || 'Continue to Verification'}</span> : 
            <span>{translations?.submitRequest || 'Submit Request'}</span>
          }
        </button>
      </div>
    </div>
  );
};

export default Step3Profile;