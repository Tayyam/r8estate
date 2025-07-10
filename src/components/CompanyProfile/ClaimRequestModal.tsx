import React, { useState } from 'react';
import { Building2, Phone, Mail, Send, X, AlertCircle, RefreshCw, ExternalLink, Info } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile } from '../../types/companyProfile';

interface ClaimRequestModalProps {
  company: CompanyProfile;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const generateRandomPassword = (): string => {
  return Math.floor(100000000 + Math.random() * 900000000).toString();
};

const extractDomainFromUrl = (url?: string): string => {
  if (!url) return '';
  try {
    // Remove protocol and www
    const domainWithPath = url.replace(/(https?:\/\/)?(www\.)?/, '');
    // Extract domain (up to the first slash)
    const domain = domainWithPath.split('/')[0];
    return domain;
  } catch (error) {
    console.error('Error extracting domain:', error);
    return '';
  }
};

const ClaimRequestModal: React.FC<ClaimRequestModalProps> = ({
  company,
  onClose,
  onSuccess,
  onError
}) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const [verificationStep, setVerificationStep] = useState<'form' | 'verification'>('form');
  const [verificationSent, setVerificationSent] = useState(false);
  const [companyDomain, setCompanyDomain] = useState<string>(extractDomainFromUrl(company.website));
  const [hasCompanyEmail, setHasCompanyEmail] = useState<boolean>(false);
  const [sendingVerification, setSendingVerification] = useState<boolean>(false);
  const [tempPassword, setTempPassword] = useState<string>(generateRandomPassword());

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contactPhone: '',
    businessEmail: '',
    supervisorEmail: ''
  });

  // Check if email belongs to company domain
  const isCompanyEmail = (email: string): boolean => {
    if (!companyDomain) return false;
    const emailDomain = email.split('@')[1];
    return emailDomain === companyDomain;
  };

  // Check if either business or supervisor email matches company domain
  const checkCompanyEmails = (): void => {
    const hasBusiness = isCompanyEmail(formData.businessEmail);
    const hasSupervisor = isCompanyEmail(formData.supervisorEmail);
    setHasCompanyEmail(hasBusiness || hasSupervisor);
  };

  // Handle input change
  const handleInputChange = (field: string, value: string) => {
    const newFormData = {
      ...formData,
      [field]: value
    };
    
    setFormData(newFormData);
    
    // Check if emails match company domain after update
    if (field === 'businessEmail' || field === 'supervisorEmail') {
      setTimeout(() => {
        const hasBusiness = isCompanyEmail(newFormData.businessEmail);
        const hasSupervisor = isCompanyEmail(newFormData.supervisorEmail);
        setHasCompanyEmail(hasBusiness || hasSupervisor);
      }, 100);
    }
  };

  // Send verification emails
  const sendVerificationEmails = async () => {
    try {
      setSendingVerification(true);
      
      // In a real implementation, you would:
      // 1. Create user accounts for the emails with the temp password
      // 2. Send verification emails to both addresses
      // 3. Store verification state in the database
      
      // For now, we'll simulate this
      setTimeout(() => {
        setVerificationSent(true);
        setSendingVerification(false);
      }, 2000);
      
      // Reset temp password on resend
      setTempPassword(generateRandomPassword());
      
    } catch (error) {
      console.error('Error sending verification emails:', error);
      onError(translations?.failedToSendVerification || 'Failed to send verification emails');
      setSendingVerification(false);
    }
  };

  // Proceed to verification step
  const proceedToVerification = () => {
    setVerificationStep('verification');
    sendVerificationEmails();
  };

  // Reset the form to initial state
  const resetForm = () => {
    setFormData({
      ...prev,
      businessEmail: '',
      supervisorEmail: '',
      contactPhone: ''
    });
    setVerificationStep('form');
    setVerificationSent(false);
    setHasCompanyEmail(false);
    setTempPassword(generateRandomPassword());
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

    // If the user has company domain email, proceed to verification step
    if (hasCompanyEmail && verificationStep === 'form') {
      proceedToVerification();
      return;
    }

    try {
      setLoading(true);
      
      // Create claim request document
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
    } catch (error) {
      console.error('Error submitting claim request:', error);
      onError(translations?.failedToSubmitRequest || 'Failed to submit claim request. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
                {translations?.claimCompanyDesc || `Request ownership of ${company.name}`}
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
        <div className="bg-blue-50 p-4 rounded-xl mb-6">
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

        {/* Company Domain Information - Show if website exists */}
        {company.website && (
          <div className={`bg-${hasCompanyEmail ? 'green' : 'yellow'}-50 p-4 rounded-xl mb-6`}>
            <div className="flex items-start space-x-3 rtl:space-x-reverse">
              <Info className={`h-6 w-6 text-${hasCompanyEmail ? 'green' : 'yellow'}-600 flex-shrink-0 mt-0.5`} />
              <div>
                <h4 className={`font-medium text-${hasCompanyEmail ? 'green' : 'yellow'}-800 mb-1`}>
                  {hasCompanyEmail ? 
                    (translations?.companyEmailDetected || 'Company Email Detected') :
                    (translations?.companyDomainInfo || 'Company Domain Information')}
                </h4>
                <p className={`text-sm text-${hasCompanyEmail ? 'green' : 'yellow'}-700`}>
                  {hasCompanyEmail ?
                    (translations?.companyEmailMatchDetected || `Email detected from company domain: ${companyDomain}. This will enable streamlined verification.`) :
                    (translations?.companyDomainSuggestion || `For faster verification, use an email from the company domain: ${companyDomain}`)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form or Verification Step */}
        {verificationStep === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
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
          </div>

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
                placeholder={translations?.enterBusinessEmail || 'Enter business email'}
                className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
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
                placeholder={translations?.enterSupervisorEmail || 'Enter supervisor email'}
                className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

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
              disabled={loading}
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
                  : (translations?.submitRequest || 'Submit Request')
                }
              </span>
            </button>
          </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-100 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {translations?.verificationEmailsSent || 'Verification Emails Sent'}
              </h3>
              
              <p className="text-gray-600 mb-4">
                {translations?.verificationEmailsExplanation || 
                 'We\'ve sent verification emails to the business and supervisor emails. Please check both inboxes and verify at least one email address to proceed.'}
              </p>
              
              <div className="border border-green-200 rounded-lg p-4 mb-6 bg-white text-left">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  {translations?.temporaryPassword || 'Temporary Password'}
                </h4>
                <div className="bg-gray-100 p-3 rounded flex items-center justify-between">
                  <span className="font-mono text-lg tracking-wider">{tempPassword}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(tempPassword);
                      onSuccess(translations?.passwordCopied || 'Password copied to clipboard');
                    }}
                    className="text-blue-600 hover:text-blue-800"
                    title={translations?.copyPassword || 'Copy password'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {translations?.tempPasswordExplanation || 
                   'Use this temporary password to log in after verifying your email. You\'ll be prompted to change it after first login.'}
                </p>
              </div>
              
              {/* Email Instructions */}
              <div className="space-y-2 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                    <span className="text-green-600 text-xs font-bold">1</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-2 text-left">
                    {translations?.checkEmailInstruction || 'Check your email inbox and spam folder'}
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                    <span className="text-green-600 text-xs font-bold">2</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-2 text-left">
                    {translations?.clickVerificationLink || 'Click on the verification link in the email'}
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                    <span className="text-green-600 text-xs font-bold">3</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-2 text-left">
                    {translations?.loginWithTempPassword || 'Log in with the temporary password above'}
                  </p>
                </div>
              </div>
              
              {/* Resend button */}
              <button
                onClick={sendVerificationEmails}
                disabled={sendingVerification}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 mt-2"
              >
                {sendingVerification ? (
                  <>
                    <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    <span>{translations?.resendingVerification || 'Resending...'}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
                    <span>{translations?.resendVerificationEmails || 'Resend Verification Emails'}</span>
                  </>
                )}
              </button>
              
              <div className="text-xs text-gray-500 mt-4">
                {translations?.emailVerificationNote || 
                 'Please note: Your claim request will be processed after email verification. You\'ll receive a confirmation when your claim is approved.'}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
              <button 
                onClick={resetForm}
                className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-colors duration-200"
              >
                {translations?.backToForm || 'Back to Form'}
              </button>
              
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200"
              >
                {translations?.closeAndWait || 'Close and Wait for Verification'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimRequestModal;