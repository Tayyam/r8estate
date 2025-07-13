import React, { useState, useEffect } from 'react';
import { Building2, X, AlertCircle } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db, auth, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile } from '../../types/companyProfile';
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
  const sendOTPEmail = async (email: string, otp: string) => {
    try {
      // Send OTP email via function
      const sent = await sendOTPVerificationEmail(email, otp, company.name);
      
      if (!sent) {
        console.error("Failed to send OTP email");
        return false;
      }
      
      return sent;
    } catch (error) {
      console.error("Error sending OTP email:", error);
      return false;
    }
          onSuccess(translations?.verificationEmailsSent || 
            'Verification emails have been sent to both business and supervisor emails. A temporary password has been generated and included in the emails. Please check both inboxes to complete the verification process.');
            
          // Close the modal
          onClose();
        } else {
          throw new Error(data.message || 'Failed to send verification emails');
        }
      } catch (error) {
        console.error('Error calling claimProcess function:', error);
        onError(translations?.failedToSendVerification || 'Failed to send verification emails. Please try again later.');
      }

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
      
      // Create user account with stored info
      try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, formData.businessEmail, formData.password);
        const user = userCredential.user;
      if (currentStep === 2) {
        // Update user profile
        await updateProfile(user, {
          displayName: formData.displayName,
          photoURL: photoURL || undefined
        });
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          requesterName: currentUser?.displayName || 'Guest User',
          displayName: formData.displayName,
          email: formData.businessEmail,
          companyId: company.id, // Link to the company
          isEmailVerified: user.emailVerified,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        
        // Mark the company as claimed
        await updateDoc(doc(db, 'companies', company.id), {
          claimed: true,
          email: formData.businessEmail,
          updatedAt: serverTimestamp(),
          claimedByName: formData.displayName // Add name of the user who claimed
        });
        
        // Skip creating a claim request document for domain-verified claims
        // since they're already verified through the domain email
        
        onSuccess(translations?.claimRequestSubmitted || 'Claim request submitted successfully! We will review your request and contact you soon.');
        onClose();
      } catch (error: any) {
        console.error('Error creating account:', error);
        if (error.code === 'auth/email-already-in-use') {
          onError(translations?.emailAlreadyInUse || 'This email is already in use by another account');
        } else {
          onError(translations?.failedToSubmitRequest || 'Failed to submit claim request. Please try again later.');
        }
      }
      
    } catch (error) {
      console.error("Error verifying OTP:", error);
      onError('Failed to verify code');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle non-verification claim request
  const handleNonVerificationClaim = async () => {
    try {
      if (!formData.contactPhone || !formData.businessEmail) {
        onError(translations?.fillAllFields || 'Please fill in all required fields');
        return;
      }
      
      setLoading(true);

      // Generate tracking number
      const trackingNum = generateTrackingNumber();
      setTrackingNumber(trackingNum);
      
      // Store in localStorage
      localStorage.setItem('claimTrackingNumber', trackingNum);
      
      const claimRequestRef = await addDoc(collection(db, 'claimRequests'), {
        companyId: company.id,
        companyName: company.name,
        requesterId: currentUser?.uid || null,
        requesterName: currentUser?.displayName || 'Guest User',
        contactPhone: formData.contactPhone,
        businessEmail: formData.businessEmail,
        status: 'pending',
        trackingNumber: trackingNum,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Notify admins about the new claim request
      await notifyAdminsOfNewClaimRequest(claimRequestRef.id, company.name);
      
      onSuccess(
        (translations?.claimRequestSubmittedWithTracking || 
         `Claim request submitted successfully! Your tracking number is: ${trackingNum}. Please save this number to check your request status later.`)
      );
      onClose();
    } catch (error) {
      console.error('Error submitting claim request:', error);
      onError(translations?.failedToSubmitRequest || 'Failed to submit claim request. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form step navigation
  const handleNextStep = async () => {
    if (currentStep === 2) {
      // For credentials step - validate and move to profile
      if (!formData.businessEmail) {
        onError(translations?.emailRequired || 'Email address is required');
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.businessEmail)) {
        onError(translations?.invalidEmailFormat || 'Please enter a valid email address');
        return;
      }
      
      // Validate domain if applicable
      if (hasDomainEmail && !validateEmailDomain(formData.businessEmail)) {
        onError(translations?.businessEmailDomainMismatch || 'Business email must match the company domain: ' + companyDomain);
        return;
      }
      
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // For profile step - validate, then go to OTP or submit claim
      if (!formData.displayName.trim()) {
        onError(translations?.nameRequired || 'Name is required');
        return;
      }
      
      try {
        setLoading(true);
                
        if (hasDomainEmail) {
          // Send OTP for domain verification
          await handleSendOTP();
        } else {
          // Submit non-verification claim
          await handleNonVerificationClaim();
        }
      } catch (error) {
        console.error('Error processing request:', error);
        onError(translations?.failedToProcess || 'Failed to process your request. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle OTP for non-logged in users
  const handleOTPVerificationForGuest = async () => {
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

      // Generate tracking number for domain verified requests too
      const trackingNum = generateTrackingNumber();
      setTrackingNumber(trackingNum);
      
      // Store in localStorage 
      localStorage.setItem('claimTrackingNumber', trackingNum);
      
      // Mark OTP as verified
      setOtpVerified(true);
      
      // Create a claim request for admin review
      const claimRequestRef = await addDoc(collection(db, 'claimRequests'), {
        companyId: company.id,
        companyName: company.name,
        requesterId: currentUser?.uid || null,
        requesterName: formData.displayName || 'Guest User',
        contactPhone: formData.contactPhone || '',
        businessEmail: formData.businessEmail,
        displayName: formData.displayName,
        password: formData.password, // Save password for domain-verified claims too
        status: 'pending',
        domainVerified: true, // Mark as domain verified
        createdAt: serverTimestamp(),
        trackingNumber: trackingNum,
        updatedAt: serverTimestamp()
      });
      
      // Notify admins about the new claim request
      await notifyAdminsOfNewClaimRequest(claimRequestRef.id, company.name);
      
      onSuccess(
        (translations?.claimRequestSubmittedWithTracking || 
         `Claim request submitted successfully! Your tracking number is: ${trackingNum}. Please save this number to check your request status later.`)
      );
      onClose();
    } catch (error) {
      console.error("Error processing domain-verified request:", error);
      onError('Failed to submit your request. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (loading || otpSending) {
        // Prevent closing if loading
        return;
      }
      const shouldClose = confirm(translations?.confirmCloseClaim || 'Are you sure you want to close? Your progress will not be saved.');
      if (shouldClose) {
        onClose();
      }
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
            handleVerifyOTP={currentUser ? handleVerifyOTP : handleOTPVerificationForGuest}
            setCurrentStep={(step) => setCurrentStep(step <= 2 ? step : 2)}
            translations={translations}
          />
        )}
      </div>
    </div>
  );
};

export default ClaimRequestModal;