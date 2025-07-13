import React from 'react';
import { Mail, Phone, Building2, AlertCircle } from 'lucide-react';
import { CompanyProfile } from '../../../types/companyProfile';

interface Step2CredentialsProps {
  company: CompanyProfile;
  formData: {
    businessEmail: string;
    contactPhone: string;
  };
  hasDomainEmail: boolean | null;
  companyDomain: string;
  supervisorEmail: string;
  setSupervisorEmail: (email: string) => void;
  handleInputChange: (field: string, value: string) => void;
  validateEmailDomain: (email: string) => boolean;
  handleNextStep: () => void;
  onClose: () => void;
  translations: any;
}

const Step2Credentials: React.FC<Step2CredentialsProps> = ({
  company,
  formData,
  hasDomainEmail,
  companyDomain,
  supervisorEmail,
  setSupervisorEmail,
  handleInputChange,
  validateEmailDomain,
  handleNextStep,
  onClose,
  translations
}) => {
  return (
    <form className="p-6 space-y-6">
      {/* Company Name Display */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {translations?.company || 'Company'}
        </label>
        <div className="flex items-center space-x-3 rtl:space-x-reverse p-3 bg-gray-50 rounded-lg">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={company.name}
              className="w-8 h-8 object-cover rounded"
            />
          ) : (
            <Building2 className="h-5 w-5 text-gray-500" />
          )}
          <span className="font-medium text-gray-900">{company.name}</span>
        </div>
        {company.website && (
          <p className="mt-1 text-sm text-gray-500">
            {translations?.websiteLabel || 'Website'}: {company.website}
          </p>
        )}
      </div>

      {/* Email & Password */}
      <div className="space-y-4">
        {/* Email Field */}
        <div>
          <label htmlFor="businessEmail" className="block text-sm font-medium text-gray-700 mb-1">
            {translations?.businessEmail || 'Business Email'} *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              id="businessEmail"
              type="email"
              required
              value={formData.businessEmail}
              onChange={(e) => handleInputChange('businessEmail', e.target.value)}
              className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={hasDomainEmail 
                ? `business@${companyDomain}`
                : translations?.enterBusinessEmail || 'Enter your business email'}
            />
          </div>
          {hasDomainEmail && formData.businessEmail && !validateEmailDomain(formData.businessEmail) && (
            <p className="mt-1 text-sm text-red-600">
              {translations?.emailMustMatchDomain?.replace('{domain}', companyDomain) || 
               `Email must match the company domain (@${companyDomain})`}
            </p>
          )}
        </div>
        
        {/* Supervisor Email Field */}
        <div>
          <label htmlFor="supervisorEmail" className="block text-sm font-medium text-gray-700 mb-1">
            {translations?.supervisorEmail || 'Supervisor Email'} *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              id="supervisorEmail"
              type="email"
              required
              value={supervisorEmail}
              onChange={(e) => setSupervisorEmail(e.target.value)}
              placeholder={translations?.enterSupervisorEmail || 'Enter supervisor email address'}
              className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {translations?.supervisorEmailHelp || "Your supervisor's email will be used to verify your company claim."}
          </p>
        </div>
        
        {/* Supervisor Email Field */}
        <div>
          <label htmlFor="supervisorEmail" className="block text-sm font-medium text-gray-700 mb-1">
            {translations?.supervisorEmail || 'Supervisor Email'} *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              id="supervisorEmail"
              type="email"
              required
              value={supervisorEmail}
              onChange={(e) => setSupervisorEmail(e.target.value)}
              placeholder={translations?.enterSupervisorEmail || 'Enter supervisor email address'}
              className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {translations?.supervisorEmailHelp || "Your supervisor's email will be used to verify your company claim."}
          </p>
        </div>
        
        {/* Domain Instructions for domain email users */}
        {hasDomainEmail && companyDomain && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="flex items-start space-x-2 rtl:space-x-reverse">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-medium text-blue-800">
                  {translations?.domainVerificationNeeded || 'Domain Verification Needed'}
                </h5>
                <p className="text-sm text-blue-700 mt-1">
                  {translations?.enterEmailsWithDomain?.replace('{domain}', companyDomain) || 
                   `Please enter email addresses that end with @${companyDomain}. These will be used to verify your ownership of the company.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Contact Phone - Only show if not using domain verification */}
        {!hasDomainEmail && (
          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
              {translations?.contactPhone || 'Contact Phone'} *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                id="contactPhone"
                type="text"
                required
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                placeholder={translations?.enterContactPhone || 'Enter contact phone number'}
                className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          {translations?.cancel || 'Cancel'}
        </button>
        
        <button
          type="button"
          onClick={handleNextStep}
          className="px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {translations?.next || 'Next'}
        </button>
      </div>
    </form>
  );
};

export default Step2Credentials;