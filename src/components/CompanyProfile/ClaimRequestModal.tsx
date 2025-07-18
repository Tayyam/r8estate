import React, { useState, useEffect, useCallback } from 'react';
import { Building2, X, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext'; 
import { CompanyProfile } from '../../types/companyProfile';
import Step2Credentials from './ClaimRequestModal/Step2Credentials';
import { httpsCallable } from 'firebase/functions';

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
  const [hasDomainEmail, setHasDomainEmail] = useState<boolean>(false);
  // New UI states
  const [processingStep, setProcessingStep] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTrackingNumber, setSuccessTrackingNumber] = useState('');

  // Form and verification state
  const [formData, setFormData] = useState({
    contactPhone: '',
    businessEmail: '',
    displayName: '',
    password: ''
  });
  
  // Only one step now - credentials
  const [currentStep, setCurrentStep] = useState(1);

  // Extract domain from website
  useEffect(() => {
    if (company.website) {
      try {
        const url = new URL(company.website);
        const domain = url.hostname.replace('www.', '');
        setCompanyDomain(domain);
        setHasDomainEmail(true); // Automatically use domain method if website exists
      } catch (error) {
        console.error("Error extracting domain:", error);
        setHasDomainEmail(false); // Fallback to non-domain method if URL is invalid
      }
    } else {
      setHasDomainEmail(false); // Use non-domain method if no website
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
    if (currentStep === 1) {
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
    setProcessingStep(translations?.processingRequest || 'Processing your request...');

    const trackingNumber = generateTrackingNumber();

    if (hasDomainEmail) {
      // ⛅️ Domain method → استخدم Cloud Function لإرسال الإيميل والتحقق
      const claimProcessFunction = httpsCallable(functions, 'claimProcess');
      setProcessingStep(translations?.sendingEmails || 'Sending verification emails...');

      const response = await claimProcessFunction({
        businessEmail: formData.businessEmail,
        supervisorEmail: supervisorEmail,
        companyId: company.id,
        companyName: company.name,
        contactPhone: formData.contactPhone,
        displayName: currentUser?.displayName || formData.displayName || company.name,
        trackingNumber,
      });

      const responseData = response.data as any;
      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to process claim request');
      }

    } else {
      // 📝 Non-domain method → سجّل مباشرة في Firestore
      await addDoc(collection(db, 'claimRequests'), {
        companyId: company.id,
        companyName: company.name,
        requesterId: currentUser?.uid || null,
        requesterName: currentUser?.displayName || formData.displayName || company.name,
        businessEmail: formData.businessEmail,
        supervisorEmail: supervisorEmail,
        contactPhone: formData.contactPhone || '',
        status: 'pending',
        trackingNumber,
        businessEmailVerified: false,
        supervisorEmailVerified: false,
        domainVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    setProcessingStep(translations?.finalizingRequest || 'Finalizing your request...');
    localStorage.setItem('claimTrackingNumber', trackingNumber);
    setSuccessTrackingNumber(trackingNumber);
    setSuccessMessage(
      translations?.claimRequestSubmittedWithTracking?.replace('{tracking}', trackingNumber) ||
      `Claim request submitted successfully! Your tracking number is: ${trackingNumber}. Please keep this number for reference.`
    );
    setShowSuccess(true);

  } catch (error) {
    console.error("Error submitting claim request:", error);
    onError(translations?.claimRequestFailed || 'Failed to submit claim request');
    setProcessingStep('');
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

        {/* Explanation Section */}
        <div className="bg-blue-50 p-4 m-6 mb-0 rounded-xl">
          <div className="flex items-start space-x-3 rtl:space-x-reverse">
            <AlertCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 mb-1">
                {translations?.claimRequestInfo || 'Request Verification'}
              </h4>
              <p className="text-sm text-blue-700">
                {hasDomainEmail 
                  ? (translations?.domainVerificationExplanation || 'We will verify your ownership using your company domain email address.')
                  : (translations?.nonDomainVerificationExplanation || 'We will verify your ownership through email verification and manual review.')
                }
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && !showSuccess && (
          <div className="p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h4 className="text-lg font-medium text-gray-900 mb-3 text-center">
              {processingStep}
            </h4>
            <p className="text-gray-600 text-center mb-4">
              {translations?.pleaseWaitProcessing || 'Please wait while we process your claim request...'}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
              <div className="bg-blue-600 h-2.5 rounded-full w-3/4 animate-pulse"></div>
            </div>
            <p className="text-sm text-gray-500 text-center">
              {translations?.doNotCloseWindow || 'Do not close this window during the process'}
            </p>
          </div>
        )}
        
        {/* Success State */}
        {showSuccess && (
          <div className="p-6 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h4 className="text-xl font-bold text-green-700 mb-3 text-center">
              {translations?.requestSubmittedSuccessfully || 'Request Submitted Successfully!'}
            </h4>
            <p className="text-gray-700 text-center mb-6">
              {successMessage}
            </p>
            <div className="bg-blue-50 p-4 rounded-lg w-full mb-6">
              <h5 className="font-medium text-blue-800 text-center mb-2">
                {translations?.trackingNumber || 'Tracking Number'}
              </h5>
              <p className="text-2xl text-blue-900 font-bold text-center">
                {successTrackingNumber}
              </p>
              <p className="text-sm text-blue-700 text-center mt-2">
                {translations?.keepTrackingNumber || 'Please save this number for tracking your request status'}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg w-full mb-6">
              <h5 className="font-medium text-yellow-800 text-center mb-2">
                {translations?.nextSteps || 'Next Steps'}
              </h5>
              <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-2 text-left">
                <li>{translations?.checkBusinessEmail || 'Check your business email for a verification link'}</li>
                <li>{translations?.verifySupervisorEmail || 'Ensure your supervisor verifies their email'}</li>
                <li>{translations?.waitForApproval || 'Once both emails are verified, your claim will be automatically approved'}</li>
              </ol>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200">
              {translations?.close || 'Close'}
            </button>
          </div>
        )}

        {/* Step Content */}
        {currentStep === 1 && !loading && !showSuccess && (
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