import React, { useState, useEffect, useCallback } from 'react';
import { Building2, X, AlertCircle } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db, auth, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile } from '../../types/companyProfile';
import { sendOTPEmail } from '../../utils/emailUtils';
import Step1Domain from './ClaimRequestModal/Step1Domain';
import Step2Credentials from './ClaimRequestModal/Step2Credentials';
import Step4OTPVerification from './ClaimRequestModal/Step4OTPVerification';
import { notifyAdminsOfNewClaimRequest } from '../../utils/notificationUtils';
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
  const [otpSending, setOtpSending] = useState(false);
  
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
  
  // OTP and verification state
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  
  // Step selection (1: Domain choice, 2: Basic info, 3: OTP Verification)
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

  // Generate a random 6-digit OTP
  const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Handle backdrop click to close modal
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading && !otpSending) {
      onClose();
    }
  }, [onClose, loading, otpSending]);

  // Handle next step progression
  const handleNextStep = async () => {
    if (currentStep === 2) {
      // Validate Step 2 fields
      if (!formData.contactPhone || !formData.businessEmail || !supervisorEmail) {
        onError(translations?.allFieldsRequired || 'All fields are required');
        return;
      }

      if (hasDomainEmail && !validateEmailDomain(formData.businessEmail)) {
        onError(translations?.invalidEmailDomain || 'Business email must use company domain');
        return;
      }

      // Send OTP and move to verification step
      await handleSendOTP();
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      onError(translations?.invalidOTPLength || 'Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      
      // Verify OTP
      const isValid = await verifyOTP(formData.businessEmail, otpCode);
      if (!isValid) {
        onError(translations?.invalidOTP || 'Invalid or expired verification code');
        return;
      }

      setOtpVerified(true);
      
      // Submit claim request
      await handleSubmitClaimRequest();
    } catch (error) {
      console.error("Error verifying OTP:", error);
      onError(translations?.verificationFailed || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification for guest users
  const handleOTPVerificationForGuest = async () => {
    // For guest users, just verify the OTP and submit the claim request
    await handleVerifyOTP();
  };

  // Submit claim request
  const handleSubmitClaimRequest = async () => {
    try {
      setLoading(true);
      
      // Generate tracking number
      const newTrackingNumber = generateTrackingNumber();
      setTrackingNumber(newTrackingNumber);
      
      // Prepare claim request data
      const claimRequestData = {
        companyId: company.id,
        companyName: company.name,
        userId: currentUser?.uid || null,
        userEmail: currentUser?.email || null,
        displayName: currentUser?.displayName || 'Anonymous User',
        contactPhone: formData.contactPhone,
        businessEmail: formData.businessEmail,
        supervisorEmail: supervisorEmail,
        trackingNumber: newTrackingNumber,
        status: 'pending',
        createdAt: serverTimestamp(),
        hasDomainEmail: hasDomainEmail,
        companyDomain: companyDomain
      };
      
      // Add to Firestore
      await addDoc(collection(db, 'claimRequests'), claimRequestData);
      
      // Mark OTP as used
      const otpQuery = query(
        collection(db, 'otp'),
        where('email', '==', formData.businessEmail),
        where('otp', '==', otpCode),
        where('used', '==', false)
      );
      
      const otpSnapshot = await getDocs(otpQuery);
      if (!otpSnapshot.empty) {
        const otpDoc = otpSnapshot.docs[0];
        await updateDoc(doc(db, 'otp', otpDoc.id), { used: true });
      }
      
      // Notify admins
      await notifyAdminsOfNewClaimRequest(claimRequestData);
      
      onSuccess(translations?.claimRequestSubmitted?.replace('{trackingNumber}', newTrackingNumber) || 
               `Claim request submitted successfully! Tracking number: ${newTrackingNumber}`);
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

  // Store OTP in Firestore
  const storeOTP = async (email: string, otp: string): Promise<boolean> => {
    try {
      // Create expiration date (60 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 60);
      
      // Store in 'otp' collection
      await addDoc(collection(db, 'otp'), {
        userId: currentUser?.uid || null,
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
  const handleSendOTP = async () => {
    try {
      setOtpSending(true);
      
      // Generate OTP
      const otp = generateOTP();
      
      // Store OTP in Firestore
      const stored = await storeOTP(formData.businessEmail, otp);
      if (!stored) {
        throw new Error('Failed to store OTP');
      }
      
      // Send OTP email
      const sent = await sendOTPEmail(formData.businessEmail, otp);
      if (!sent) {
        throw new Error('Failed to send OTP email');
      }
      
      setCurrentStep(4);
      onSuccess(translations?.otpSent || 'Verification code sent successfully');
    } catch (error) {
      console.error("Error sending OTP:", error);
      onError(translations?.failedToSendOTP || 'Failed to send verification code');
    } finally {
      setOtpSending(false);
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
                {translations?.claimCompanyDesc?.replace('{company}', company.name) || `Request ownership of ${company.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={loading || otpSending}
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
        
        {currentStep === 3 && (
          <Step4OTPVerification
            formData={formData}
            otpCode={otpCode}
            setOtpCode={setOtpCode}
            loading={loading}
            otpSending={otpSending}
            handleSendOTP={handleSendOTP}
            handleVerifyOTP={handleVerifyOTP}
            setCurrentStep={(step) => setCurrentStep(step <= 2 ? step : 2)}
            translations={translations}
          />
        )}
      </div>
    </div>
  );
};

export default ClaimRequestModal;