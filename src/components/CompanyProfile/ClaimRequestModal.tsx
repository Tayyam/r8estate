import React, { useState, useEffect, useCallback } from 'react';
import { Building2, X, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile } from '../../types/companyProfile';
import Step1Domain from './ClaimRequestModal/Step1Domain';
import Step2Credentials from './ClaimRequestModal/Step2Credentials';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

interface ClaimRequestModalProps {
  company: CompanyProfile;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ClaimRequestModal: React.FC<ClaimRequestModalProps> = ({
  company,
  onClose,
  onSuccess,
  onError
}) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  
  // Add state for supervisor email
  const [supervisorEmail, setSupervisorEmail] = useState('');
  
  // Tracking number state
  const [trackingNumber, setTrackingNumber] = useState('');
  
  // Domain-related state
  const [companyDomain, setCompanyDomain] = useState('');
  const [hasDomainEmail, setHasDomainEmail] = useState<boolean | null>(null);

  // Form and verification state
  const [formData, setFormData] = useState({
    contactPhone: '',
    businessEmail: '',
    displayName: '',
    password: ''
  });
  
  // Step selection (1: Domain choice, 2: Basic info)
  const [currentStep, setCurrentStep] = useState(1);

  // Extract domain from website
  useEffect(() => {
    if (company.website) {
      try {
        const url = new URL(company.website);
        const domain = url.hostname.replace('www.', '');
        setCompanyDomain(domain);
      } catch (error) {
        console.error("Error extracting domain:", error);
      }
    }
  }, [company.website]);

  // Generate a 6-digit tracking number
  const generateTrackingNumber = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  // Handle next step progression
  const handleNextStep = async () => {
    if (currentStep === 2) {
      // Validate Step 2 fields
      // Only require contactPhone when not using domain email
      if (!formData.businessEmail || !supervisorEmail || (!hasDomainEmail && !formData.contactPhone)) {
        onError(translations?.allFieldsRequired || 'All fields are required');
        return;
      }

      if (hasDomainEmail && !validateEmailDomain(formData.businessEmail)) {
        onError(translations?.invalidEmailDomain || 'Business email must use company domain');
        return;
      }

      // Submit claim request directly
      await handleSubmitClaimRequest();
    }
  };

  // Submit claim request
  const handleSubmitClaimRequest = async () => {
    try {
      setLoading(true);

      // Call the cloud function for claim process
      const claimProcessFunction = httpsCallable(functions, 'claimProcess');
      const response = await claimProcessFunction({
        businessEmail: formData.businessEmail,
        supervisorEmail: supervisorEmail,
        companyId: company.id,
        companyName: company.name,
        contactPhone: formData.contactPhone,
        displayName: currentUser?.displayName || formData.displayName || company.name
      };
      );

      // Extract response data
      const responseData = response.data as any;
      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to process claim request');
      }

      // Store tracking number in local storage for future reference
      if (responseData.trackingNumber) {
        localStorage.setItem('claimTrackingNumber', responseData.trackingNumber);
      }

      // Show success message with tracking number
      onSuccess(translations?.claimRequestSubmitted?.replace('{tracking}', responseData.trackingNumber) || 
               `Claim request submitted successfully! Your tracking number is: ${responseData.trackingNumber}. Please keep this number for reference.`);
      onClose();

    } catch (error) {
      console.error("Error submitting claim request:", error);
      onError(translations?.claimRequestFailed || 'Failed to submit claim request');
    } finally {
      setLoading(false);
    }
  };

  // Handle domain choice
  const handleDomainChoice = (hasDomain: boolean) => {
    setHasDomainEmail(hasDomain);
    setCurrentStep(2);
  };

  // Handle input change
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validate email domain
  const validateEmailDomain = (email: string): boolean => {
    if (!companyDomain || !email) return false;
    
    const emailDomain = email.split('@')[1];
    return emailDomain === companyDomain;
  };


  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-screen overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
           <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {translations?.claimCompanyRequest || 'Claim Company Request'}
              </h3>
              <p className="text-sm text-gray-600">
                {translations?.claimCompanyDesc?.replace('{company}', company.name) || `Request ownership of ${company.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Explanation Section - Only show in first step */}
        {currentStep === 1 && (
          <div className="bg-blue-50 p-4 m-6 mb-0 rounded-xl">
            <div className="flex items-start space-x-3 rtl:space-x-reverse">
              <AlertCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800 mb-1">
                  {translations?.claimRequestInfo || 'Request Verification'}
                </h4>
                <p className="text-sm text-blue-700">
                  {translations?.claimRequestExplanation || 
                   'To verify your ownership of this company, we need some additional information. Our team will review your request and may contact you for further verification.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        {currentStep === 1 && (
          <Step1Domain 
            companyDomain={companyDomain}
            handleDomainChoice={handleDomainChoice}
            translations={translations}
          />
        )}
        
        {currentStep === 2 && (
          <Step2Credentials
            company={company}
            formData={formData}
            hasDomainEmail={hasDomainEmail}
            companyDomain={companyDomain}
            supervisorEmail={supervisorEmail}
            setSupervisorEmail={setSupervisorEmail}
            handleInputChange={handleInputChange}
            validateEmailDomain={validateEmailDomain}
            handleNextStep={handleNextStep}
            onClose={onClose}
            translations={translations}
          />
        )}        
      </div>
    </div>
  );
};

export default ClaimRequestModal;