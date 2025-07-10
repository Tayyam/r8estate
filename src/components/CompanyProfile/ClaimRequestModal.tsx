import React, { useState, useEffect } from 'react';
import { Building2, Phone, Mail, Send, X, AlertCircle, Check, RefreshCw, Globe } from 'lucide-react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { db, auth } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile } from '../../types/companyProfile';

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
  const [verificationSending, setVerificationSending] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  // Domain-related state
  const [companyDomain, setCompanyDomain] = useState('');
  const [hasDomainEmail, setHasDomainEmail] = useState<boolean | null>(null); // User selection for having domain email
  const [passwordGenerated, setPasswordGenerated] = useState('');
  
  // Form and verification state
  const [formData, setFormData] = useState({
    contactPhone: '',
    businessEmail: '',
    supervisorEmail: ''
  });
  const [verificationStatus, setVerificationStatus] = useState({
    sent: false,
    emailVerified: false
  });
  
  // Step selection (1: Domain choice, 2: Form, 3: Verification)
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

  // Generate a random 9-digit password
  const generateRandomPassword = () => {
    return Math.random().toString().substring(2, 11);
  };

  // Handle domain choice
  const handleDomainChoice = (hasDomain: boolean) => {
    setHasDomainEmail(hasDomain);
    
    if (hasDomain) {
      // Generate password for domain verification flow
      const randomPassword = generateRandomPassword();
      setPasswordGenerated(randomPassword);
    }
    
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

  // Create user account and send verification email
  const createUserAndSendVerification = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      return userCredential.user.uid;
    } catch (error: any) {
      console.error("Error creating user:", error);
      
      // If account already exists, we can't create it
      if (error.code === 'auth/email-already-in-use') {
        throw new Error(translations?.emailAlreadyInUse || 'This email is already in use by another account');
      }
      
      throw error;
    }
  };

  // Resend verification email
  const handleResendVerification = async () => {
    try {
      setVerificationSending(true);
      
      // Create temporary user accounts for verification
      const userCredential = await createUserWithEmailAndPassword(auth, formData.businessEmail, passwordGenerated);
      await sendEmailVerification(userCredential.user);
      
      // If supervisor email is different, create another account
      if (formData.supervisorEmail !== formData.businessEmail) {
        try {
          const supervisorCredential = await createUserWithEmailAndPassword(auth, formData.supervisorEmail, passwordGenerated);
          await sendEmailVerification(supervisorCredential.user);
        } catch (error) {
          console.error("Error creating supervisor account:", error);
          // Continue even if supervisor account creation fails
        }
      }
      
      setVerificationStatus({
        ...verificationStatus,
        sent: true
      });
      
      onSuccess(translations?.verificationEmailResent || 'Verification email has been resent. Please check your inbox.');
    } catch (error: any) {
      console.error("Error resending verification:", error);
      
      if (error.code === 'auth/email-already-in-use') {
        // This is expected if we've already created the account before
        onSuccess(translations?.verificationEmailResent || 'Verification email has been resent. Please check your inbox.');
      } else {
        onError(error.message || translations?.failedToSendVerification || 'Failed to resend verification email');
      }
    } finally {
      setVerificationSending(false);
    }
  };

  // Check verification status
  const handleCheckStatus = async () => {
    try {
      setCheckingStatus(true);
      
      // Reload the current user to get latest email verification status
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          setVerificationStatus({
            ...verificationStatus,
            emailVerified: true
          });
          onSuccess(translations?.emailVerified || 'Email verified! Your company claim is being processed.');
          return true;
        } else {
          onError(translations?.emailNotVerified || 'Email not verified yet. Please check your inbox and click the verification link.');
        }
      } else {
        onError(translations?.notLoggedIn || 'Not logged in with verification account. Please log in with the email address that was sent the verification link.');
      }
      
      return false;
    } catch (error) {
      console.error("Error checking verification status:", error);
      onError(translations?.verificationCheckFailed || 'Failed to check verification status');
      return false;
    } finally {
      setCheckingStatus(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.contactPhone || !formData.businessEmail || !formData.supervisorEmail) {
      onError(translations?.fillAllFields || 'Please fill in all fields');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.businessEmail) || !emailRegex.test(formData.supervisorEmail)) {
      onError(translations?.invalidEmailFormat || 'Please enter valid email addresses');
      return;
    }

    // If user chose domain verification, validate domain
    if (hasDomainEmail) {
      if (!validateEmailDomain(formData.businessEmail)) {
        onError(translations?.businessEmailDomainMismatch || 'Business email must match the company domain: ' + companyDomain);
        return;
      }
      
      if (!validateEmailDomain(formData.supervisorEmail)) {
        onError(translations?.supervisorEmailDomainMismatch || 'Supervisor email must match the company domain: ' + companyDomain);
        return;
      }
    }

    try {
      setLoading(true);
      
      if (hasDomainEmail) {
        // Domain verification flow
        try {
          // Create business email account
          const businessUserUid = await createUserAndSendVerification(formData.businessEmail, passwordGenerated);
          
          // Create supervisor email account if different
          let supervisorUserUid = businessUserUid;
          if (formData.supervisorEmail !== formData.businessEmail) {
            try {
              supervisorUserUid = await createUserAndSendVerification(formData.supervisorEmail, passwordGenerated);
            } catch (error) {
              console.error("Error creating supervisor account:", error);
              // Continue even if supervisor account creation fails
            }
          }
          
          // Set verification status
          setVerificationStatus({
            sent: true,
            emailVerified: false
          });
          
          // Create claim request document with verification pending
          await addDoc(collection(db, 'claimRequests'), {
            companyId: company.id,
            companyName: company.name,
            requesterId: currentUser?.uid || null,
            requesterName: currentUser?.displayName || null,
            contactPhone: formData.contactPhone,
            businessEmail: formData.businessEmail,
            supervisorEmail: formData.supervisorEmail,
            status: 'verification_pending',
            temporaryPassword: passwordGenerated,
            businessUserUid: businessUserUid,
            supervisorUserUid: supervisorUserUid,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Move to verification step
          setCurrentStep(3);
          
          onSuccess(translations?.verificationEmailSent + passwordGenerated || 'Verification email sent! Please check your inbox to verify your email address. A temporary password has been created: ' + passwordGenerated);
        } catch (error: any) {
          console.error("Error in domain verification flow:", error);
          // If there's a specific error about email in use, handle it specially
          if (error.message && error.message.includes('already in use')) {
            onError(error.message);
          } else {
            // Otherwise fall back to the regular claim process
            await createRegularClaimRequest();
          }
        }
      } else {
        // Regular claim request
        await createRegularClaimRequest();
      }
    } catch (error) {
      console.error('Error submitting claim request:', error);
      onError(translations?.failedToSubmitRequest || 'Failed to submit claim request. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Create a regular claim request without domain verification
  const createRegularClaimRequest = async () => {
    await addDoc(collection(db, 'claimRequests'), {
      companyId: company.id,
      companyName: company.name,
      requesterId: currentUser?.uid || null,
      requesterName: currentUser?.displayName || null,
      contactPhone: formData.contactPhone,
      businessEmail: formData.businessEmail,
      supervisorEmail: formData.supervisorEmail,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    onSuccess(translations?.claimRequestSubmitted || 'Claim request submitted successfully! We will review your request and contact you soon.');
    onClose();
  };

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Render domain selection step
  const renderDomainSelectionStep = () => {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="h-8 w-8 text-blue-600" />
          </div>
          <h4 className="text-lg font-bold text-gray-900 mb-2">
            {translations?.domainVerification || 'Company Domain Verification'}
          </h4>
          <p className="text-gray-600">
            {translations?.domainVerificationQuestion || 'Do you have an email address with the company domain?'} 
            {companyDomain ? ` (@${companyDomain})` : ''}
          </p>
        </div>
        
        <div className="flex flex-col space-y-3">
          <button
            onClick={() => handleDomainChoice(true)}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center justify-center space-x-2 rtl:space-x-reverse"
          >
            <Check className="h-5 w-5" />
            <span>{translations?.yesHaveDomainEmail || `Yes, I have an email with @${companyDomain}`}</span>
          </button>
          
          <button
            onClick={() => handleDomainChoice(false)}
            className="w-full py-3 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-medium"
          >
            {translations?.noDontHaveDomainEmail || 'No, I don\'t have a company email'}
          </button>
        </div>
      </div>
    );
  };

  // Render the form step
  const renderFormStep = () => {
    return (
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

        {/* Contact Phone */}
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

        {/* Business Email */}
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
              placeholder={hasDomainEmail 
                ? `business@${companyDomain}`
                : translations?.enterBusinessEmail || 'Enter business email'}
              className={`w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>
          {hasDomainEmail && !validateEmailDomain(formData.businessEmail) && formData.businessEmail && (
            <p className="mt-1 text-sm text-red-600">
              {translations?.emailMustMatchDomain?.replace('{domain}', companyDomain) || 
               `Email must match the company domain (@${companyDomain})`}
            </p>
          )}
        </div>

        {/* Supervisor Email */}
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
              value={formData.supervisorEmail}
              onChange={(e) => handleInputChange('supervisorEmail', e.target.value)}
              placeholder={hasDomainEmail 
                ? `supervisor@${companyDomain}`
                : translations?.enterSupervisorEmail || 'Enter supervisor email'}
              className={`w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>
          {hasDomainEmail && !validateEmailDomain(formData.supervisorEmail) && formData.supervisorEmail && (
            <p className="mt-1 text-sm text-red-600">
              {translations?.emailMustMatchDomain?.replace('{domain}', companyDomain) || 
               `Email must match the company domain (@${companyDomain})`}
            </p>
          )}
        </div>

        {/* Temporary Password Display for domain users */}
        {hasDomainEmail && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h5 className="text-sm font-medium text-gray-800 mb-2">
              {translations?.tempPasswordInfo || 'Your temporary password:'}
            </h5>
            <div className="bg-white p-3 rounded-lg border border-gray-300 text-center font-mono text-lg tracking-wider font-bold text-gray-800 mb-2">
              {passwordGenerated}
            </div>
            <p className="text-xs text-gray-600">
              {translations?.passwordKeepSafe || 'Please keep this password safe. You will need it to log in after verifying your email.'}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {translations?.cancel || 'Cancel'}
          </button>
          
          <button
            type="submit"
            disabled={loading || (hasDomainEmail && (!validateEmailDomain(formData.businessEmail) || !validateEmailDomain(formData.supervisorEmail)))}
            className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 rtl:space-x-reverse disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>
              {loading
                ? (translations?.submitting || 'Submitting...')
                : hasDomainEmail
                  ? (translations?.verifyAndClaim || 'Verify & Claim')
                  : (translations?.submitRequest || 'Submit Request')
              }
            </span>
          </button>
        </div>
      </form>
    );
  };

  // Render verification step
  const renderVerificationStep = () => {
    return (
      <div className="p-6 space-y-6">
        <div className={`${verificationStatus.emailVerified ? 'bg-green-50' : 'bg-yellow-50'} p-6 rounded-xl`}>
          <div className="flex items-start space-x-3 rtl:space-x-reverse">
            {verificationStatus.emailVerified ? (
              <Check className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">
                {verificationStatus.emailVerified 
                  ? (translations?.emailVerified || 'Email Verified!')
                  : (translations?.verificationPending || 'Verification Pending')}
              </h4>
              <p className="text-sm text-yellow-700">
                {verificationStatus.emailVerified
                  ? (translations?.emailVerifiedDesc || 'Your email has been verified. Your company claim is being processed.')
                  : (translations?.checkEmailForVerification || 'Please check your email and click the verification link to complete your company claim.')}
              </p>
                
              {!verificationStatus.emailVerified && (
                <div className="mt-4">
                  <p className="text-sm text-yellow-800 mb-2 font-medium">
                    {translations?.tempPasswordInfo || 'Your temporary password:'}
                  </p>
                  <div className="bg-white p-2 rounded border border-yellow-200 text-center mb-3">
                    <span className="font-mono text-yellow-900 font-bold tracking-wider">{passwordGenerated}</span>
                  </div>
                  <p className="text-xs text-yellow-700 mb-3">
                    {translations?.passwordKeepSafe || 'Please keep this password safe. You will need it to log in after verifying your email.'}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4">
                    <button
                      onClick={handleResendVerification}
                      disabled={verificationSending}
                      className="w-full sm:w-auto text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center justify-center space-x-1 rtl:space-x-reverse disabled:opacity-50 px-3 py-1 rounded hover:bg-blue-50 border border-blue-100"
                    >
                      {verificationSending ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Mail className="h-3 w-3" />
                      )}
                      <span>{translations?.resendVerification || 'Resend verification email'}</span>
                    </button>
                      
                    <button
                      onClick={handleCheckStatus}
                      disabled={checkingStatus}
                      className="w-full sm:w-auto text-green-600 hover:text-green-800 text-sm font-medium flex items-center justify-center space-x-1 rtl:space-x-reverse px-3 py-1 rounded hover:bg-green-50 border border-green-100"
                    >
                      {checkingStatus ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      <span>{translations?.checkStatus || 'Check status'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {translations?.close || 'Close'}
          </button>
        </div>
      </div>
    );
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
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Explanation Section */}
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

        {/* Step 1: Domain Selection */}
        {currentStep === 1 && renderDomainSelectionStep()}
        
        {/* Step 2: Form */}
        {currentStep === 2 && renderFormStep()}
        
        {/* Step 3: Verification */}
        {currentStep === 3 && renderVerificationStep()}
      </div>
    </div>
  );
};

export default ClaimRequestModal;