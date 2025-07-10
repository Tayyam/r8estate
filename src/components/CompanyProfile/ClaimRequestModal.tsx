import React, { useState, useEffect } from 'react';
import { Building2, Phone, Mail, Send, X, AlertCircle, Check, RefreshCw, Globe, Lock } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
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
  const [otpSending, setOtpSending] = useState(false);
  
  // Domain-related state
  const [companyDomain, setCompanyDomain] = useState('');
  const [hasDomainEmail, setHasDomainEmail] = useState<boolean | null>(null);
  
  // Form and verification state
  const [formData, setFormData] = useState({
    contactPhone: '',
    businessEmail: '',
    supervisorEmail: ''
  });
  
  // OTP and password state
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Step selection (1: Domain choice, 2: Form, 3: OTP Verification, 4: Password Creation)
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

  // Generate a random 6-digit OTP
  const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
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

  // Store OTP in Firestore
  const storeOTP = async (email: string, otp: string) => {
    try {
      // Create expiration date (60 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 60);
      
      // Store in 'otp' collection
      await addDoc(collection(db, 'otp'), {
        userId: currentUser?.uid,
        companyId: company.id,
        email: email,
        otp: otp,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(expiresAt),
        used: false
      });
      
      return true;
    } catch (error) {
      console.error("Error storing OTP:", error);
      return false;
    }
  };

  // Verify OTP from Firestore
  const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
    try {
      const now = new Date();
      
      // Query for matching OTP
      const otpQuery = query(
        collection(db, 'otp'),
        where('email', '==', email),
        where('otp', '==', otp),
        where('used', '==', false)
      );
      
      const otpSnapshot = await getDocs(otpQuery);
      
      if (otpSnapshot.empty) {
        return false;
      }
      
      const otpDoc = otpSnapshot.docs[0];
      const otpData = otpDoc.data();
      
      // Check if OTP is expired
      const expiresAt = otpData.expiresAt.toDate();
      if (now > expiresAt) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error verifying OTP:", error);
      return false;
    }
  };

  // Send OTP email
  const sendOTPEmail = async (email: string, otp: string) => {
    try {
      // In a real implementation, you would integrate with an email service
      // For now, we'll simulate it and just store the OTP in Firestore
      console.log(`Sending OTP ${otp} to ${email}`);
      return true;
    } catch (error) {
      console.error("Error sending OTP email:", error);
      return false;
    }
  };

  // Handle sending OTP
  const handleSendOTP = async () => {
    try {
      setOtpSending(true);
      
      // Generate OTP
      const otp = generateOTP();
      
      // Store OTP
      const stored = await storeOTP(formData.businessEmail, otp);
      if (!stored) {
        onError(translations?.failedToSendVerification || 'Failed to send verification code');
        return;
      }
      
      // Send OTP email
      const sent = await sendOTPEmail(formData.businessEmail, otp);
      if (!sent) {
        onError(translations?.failedToSendVerification || 'Failed to send verification code');
        return;
      }
      
      // Move to OTP verification step
      setCurrentStep(3);
      onSuccess(`OTP sent to ${formData.businessEmail}. Please check your inbox for the verification code.`);
      
    } catch (error) {
      console.error("Error sending OTP:", error);
      onError(translations?.failedToSendVerification || 'Failed to send verification code');
    } finally {
      setOtpSending(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      onError('Please enter a valid 6-digit verification code');
      return;
    }
    
    try {
      setLoading(true);
      
      // Verify OTP
      const isValid = await verifyOTP(formData.businessEmail, otpCode);
      
      if (!isValid) {
        onError('Invalid or expired verification code');
        return;
      }
      
      // Mark OTP as verified
      setOtpVerified(true);
      
      // Move to password creation step
      setCurrentStep(4);
      
    } catch (error) {
      console.error("Error verifying OTP:", error);
      onError('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  // Handle account creation
  const handleCreateAccount = async () => {
    if (!otpVerified) {
      onError('OTP verification required');
      return;
    }
    
    if (password.length < 6) {
      onError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      onError('Passwords do not match');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, formData.businessEmail, password);
      const uid = userCredential.user.uid;
      
      // Create claim request document
      await addDoc(collection(db, 'claimRequests'), {
        companyId: company.id,
        companyName: company.name,
        requesterId: currentUser?.uid || null,
        requesterName: currentUser?.displayName || null,
        contactPhone: hasDomainEmail ? '' : formData.contactPhone,
        businessEmail: formData.businessEmail,
        supervisorEmail: formData.supervisorEmail,
        businessUserUid: uid,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      onSuccess(translations?.claimRequestSubmitted || 'Claim request submitted successfully! We will review your request and contact you soon.');
      onClose();
      
    } catch (error: any) {
      console.error('Error creating account:', error);
      if (error.code === 'auth/email-already-in-use') {
        onError(translations?.emailAlreadyInUse || 'This email is already in use by another account');
      } else {
        onError(translations?.failedToSubmitRequest || 'Failed to submit claim request. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (hasDomainEmail) {
      if (!formData.businessEmail || !formData.supervisorEmail) {
        onError(translations?.fillAllFields || 'Please fill in all fields');
        return;
      }
    } else {
      if (!formData.contactPhone || !formData.businessEmail || !formData.supervisorEmail) {
        onError(translations?.fillAllFields || 'Please fill in all fields');
        return;
      }
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
      
      // Send OTP for domain verification
      await handleSendOTP();
    } else {
      // Regular claim request without domain verification
      try {
        setLoading(true);
        
        await addDoc(collection(db, 'claimRequests'), {
          companyId: company.id,
          companyName: company.name,
          requesterId: currentUser?.uid || null,
          requesterName: currentUser?.displayName || null,
          contactPhone: formData.contactPhone,
          businessEmail: formData.businessEmail,
          supervisorEmail: formData.supervisorEmail,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        onSuccess(translations?.claimRequestSubmitted || 'Claim request submitted successfully! We will review your request and contact you soon.');
        onClose();
      } catch (error) {
        console.error('Error submitting claim request:', error);
        onError(translations?.failedToSubmitRequest || 'Failed to submit claim request. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
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
          {companyDomain && (
            <button
              onClick={() => handleDomainChoice(true)}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              <Check className="h-5 w-5" />
              <span>
                {translations?.yesHaveDomainEmail || 'Yes, I have an email with'} @{companyDomain}
              </span>
            </button>
          )}
          
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
            disabled={loading || otpSending || (hasDomainEmail && (!validateEmailDomain(formData.businessEmail) || !validateEmailDomain(formData.supervisorEmail)))}
            className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 rtl:space-x-reverse disabled:opacity-50"
          >
            {loading || otpSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>
              {loading
                ? (translations?.submitting || 'Submitting...')
                : otpSending
                  ? (translations?.sendingVerification || 'Sending verification...')
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

  // Render OTP verification step
  const renderOTPVerificationStep = () => {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3 rtl:space-x-reverse">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-yellow-800 mb-1">
                OTP Verification Required
              </h5>
              <p className="text-sm text-yellow-700">
                We've sent a 6-digit verification code to <strong>{formData.businessEmail}</strong>.
                Please enter it below to verify your email.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center space-y-4">
          <div className="w-full max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
              Enter 6-digit verification code
            </label>
            <input
              type="text"
              pattern="[0-9]*"
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
              placeholder="------"
            />
          </div>
          
          <p className="text-sm text-gray-600 text-center">
            Didn't receive a code? <button
              type="button"
              onClick={handleSendOTP}
              disabled={otpSending}
              className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            >
              {otpSending ? 'Sending...' : 'Resend'}
            </button>
          </p>
          
          <p className="text-xs text-gray-500 text-center">
            OTP will expire in 60 minutes
          </p>
        </div>
        
        <div className="flex justify-end space-x-3 rtl:space-x-reverse">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {translations?.cancel || 'Cancel'}
          </button>
          
          <button
            type="button"
            onClick={handleVerifyOTP}
            disabled={loading || otpCode.length !== 6}
            className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 rtl:space-x-reverse disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span>
              {loading
                ? (translations?.verifying || 'Verifying...')
                : (translations?.verifyCode || 'Verify Code')
              }
            </span>
          </button>
        </div>
      </div>
    );
  };

  // Render password creation step
  const renderPasswordCreationStep = () => {
    return (
      <div className="p-6 space-y-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3 rtl:space-x-reverse">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="text-sm font-medium text-green-800 mb-1">
                Email Verified!
              </h5>
              <p className="text-sm text-green-700">
                Your email has been verified. Please create a password for your account to complete the claim request.
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Create Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter new password (min 6 characters)"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm password"
              />
            </div>
          </div>
          
          {password && password !== confirmPassword && (
            <p className="text-sm text-red-600">
              Passwords do not match
            </p>
          )}
          
          {password && password.length < 6 && (
            <p className="text-sm text-red-600">
              Password must be at least 6 characters
            </p>
          )}
        </div>
        
        <div className="flex justify-end space-x-3 rtl:space-x-reverse">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {translations?.cancel || 'Cancel'}
          </button>
          
          <button
            type="button"
            onClick={handleCreateAccount}
            disabled={loading || password.length < 6 || password !== confirmPassword}
            className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 rtl:space-x-reverse disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            <span>
              {loading
                ? (translations?.creatingAccount || 'Creating Account...')
                : (translations?.createAccount || 'Create Account')
              }
            </span>
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

        {/* Step 1: Domain Selection */}
        {currentStep === 1 && renderDomainSelectionStep()}
        
        {/* Step 2: Form */}
        {currentStep === 2 && renderFormStep()}
        
        {/* Step 3: OTP Verification */}
        {currentStep === 3 && renderOTPVerificationStep()}
        
        {/* Step 4: Password Creation */}
        {currentStep === 4 && renderPasswordCreationStep()}
      </div>
    </div>
  );
};

export default ClaimRequestModal;