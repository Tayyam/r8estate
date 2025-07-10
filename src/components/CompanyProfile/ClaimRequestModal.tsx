import React, { useState, useEffect } from 'react';
import { Building2, X, AlertCircle } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, auth, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile } from '../../types/companyProfile';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Step1Domain from './ClaimRequestModal/Step1Domain';
import Step2Credentials from './ClaimRequestModal/Step2Credentials';
import Step3Profile from './ClaimRequestModal/Step3Profile';
import Step4OTPVerification from './ClaimRequestModal/Step4OTPVerification';
import { sendOTPVerificationEmail } from '../../utils/emailUtils';

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
  const [hasDomainEmail, setHasDomainEmail] = useState<boolean | null>(() => {
    // Try to get saved state from localStorage
    try {
      const saved = localStorage.getItem(`claimProgress_${company.id}_hasDomainEmail`);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  
  // Form and verification state
  const [formData, setFormData] = useState({
    contactPhone: '',
    businessEmail: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // OTP and verification state
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  
  // File input ref for photo upload
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Step selection (1: Domain choice, 2: Basic info, 3: Profile info, 4: OTP Verification)
  const [currentStep, setCurrentStep] = useState(() => {
    // Try to get saved step from localStorage
    try {
      const saved = localStorage.getItem(`claimProgress_${company.id}_currentStep`);
      return saved ? parseInt(saved) : 1;
    } catch (e) {
      return 1;
    }
  });

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

  // Load saved form data
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(`claimProgress_${company.id}_formData`);
      if (savedData) {
        setFormData(JSON.parse(savedData));
      }
      
      const savedOTP = localStorage.getItem(`claimProgress_${company.id}_otpCode`);
      if (savedOTP) {
        setOtpCode(savedOTP);
      }
      
      const savedOTPVerified = localStorage.getItem(`claimProgress_${company.id}_otpVerified`);
      if (savedOTPVerified) {
        setOtpVerified(JSON.parse(savedOTPVerified));
      }
      
      const savedPhotoPreview = localStorage.getItem(`claimProgress_${company.id}_photoPreview`);
      if (savedPhotoPreview) {
        setPhotoPreview(savedPhotoPreview);
      }
    } catch (e) {
      console.error("Error loading saved progress:", e);
    }
  }, [company.id]);

  // Save progress when state changes
  useEffect(() => {
    try {
      localStorage.setItem(`claimProgress_${company.id}_hasDomainEmail`, JSON.stringify(hasDomainEmail));
      localStorage.setItem(`claimProgress_${company.id}_currentStep`, currentStep.toString());
      localStorage.setItem(`claimProgress_${company.id}_formData`, JSON.stringify(formData));
      localStorage.setItem(`claimProgress_${company.id}_otpCode`, otpCode);
      localStorage.setItem(`claimProgress_${company.id}_otpVerified`, JSON.stringify(otpVerified));
      if (photoPreview) {
        localStorage.setItem(`claimProgress_${company.id}_photoPreview`, photoPreview);
      }
    } catch (e) {
      console.error("Error saving progress:", e);
    }
  }, [company.id, hasDomainEmail, currentStep, formData, otpCode, otpVerified, photoPreview]);

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

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        onError(translations?.invalidFileType || 'Invalid file type. Please upload an image file.');
        return;
      }
      
      // Validate file size (max 2MB)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        onError(translations?.fileTooLarge || 'File too large. Maximum size is 2MB.');
        return;
      }
      
      setProfilePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };
  
  // Handle photo upload
  const uploadPhoto = async (file: File, userId: string): Promise<string | null> => {
    try {
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}_${timestamp}.${fileExtension}`;
      const storageRef = ref(storage, `profile-photos/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading photo:", error);
      return null;
    }
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
  };

  // Handle sending OTP
  const handleSendOTP = async () => {
    try {
      if (!formData.businessEmail) {
        onError(translations?.emailRequired || 'Email address is required');
        return;
      }
      
      // Basic validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.businessEmail)) {
        onError(translations?.invalidEmailFormat || 'Please enter a valid email address');
        return;
      }
      
      if (hasDomainEmail && !validateEmailDomain(formData.businessEmail)) {
        onError(translations?.businessEmailDomainMismatch || 'Business email must match the company domain: ' + companyDomain);
        return;
      }
      
      if (formData.password.length < 6) {
        onError(translations?.passwordTooShort || 'Password must be at least 6 characters long');
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        onError(translations?.passwordsDoNotMatch || 'Passwords do not match');
        return;
      }
      
      if (!formData.displayName.trim()) {
        onError(translations?.nameRequired || 'Name is required');
        return;
      }
      
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
      setCurrentStep(4);
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
      
      // Create user account with stored info
      try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, formData.businessEmail, formData.password);
        const user = userCredential.user;
        
        // Upload photo if exists
        let photoURL = null;
        if (profilePhoto) {
          photoURL = await uploadPhoto(profilePhoto, user.uid);
        }
        
        // Update user profile
        await updateProfile(user, {
          displayName: formData.displayName,
          photoURL: photoURL || undefined
        });
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          displayName: formData.displayName,
          email: formData.businessEmail,
          photoURL: photoURL,
          role: 'user', // Initially user role
          isEmailVerified: user.emailVerified,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Create claim request document
        await addDoc(collection(db, 'claimRequests'), {
          companyId: company.id,
          companyName: company.name,
          requesterId: currentUser?.uid || user.uid,
          requesterName: currentUser?.displayName || formData.displayName,
          contactPhone: hasDomainEmail ? '' : formData.contactPhone,
          businessEmail: formData.businessEmail,
          businessUserUid: user.uid,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Clear saved data after successful completion
        localStorage.removeItem(`claimProgress_${company.id}_hasDomainEmail`);
        localStorage.removeItem(`claimProgress_${company.id}_currentStep`);
        localStorage.removeItem(`claimProgress_${company.id}_formData`);
        localStorage.removeItem(`claimProgress_${company.id}_otpCode`);
        localStorage.removeItem(`claimProgress_${company.id}_otpVerified`);
        localStorage.removeItem(`claimProgress_${company.id}_photoPreview`);
        
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
    if (!currentUser) {
      onError(translations?.mustBeLoggedIn || 'You must be logged in to submit a claim request');
      return;
    }
    
    if (!formData.contactPhone || !formData.businessEmail || !formData.displayName) {
      onError(translations?.fillAllFields || 'Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      
      await addDoc(collection(db, 'claimRequests'), {
        companyId: company.id,
        companyName: company.name,
        requesterId: currentUser.uid,
        requesterName: formData.displayName || currentUser.displayName,
        contactPhone: formData.contactPhone,
        businessEmail: formData.businessEmail,
        displayName: formData.displayName,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Clear saved data
      localStorage.removeItem(`claimProgress_${company.id}_hasDomainEmail`);
      localStorage.removeItem(`claimProgress_${company.id}_currentStep`);
      localStorage.removeItem(`claimProgress_${company.id}_formData`);
      localStorage.removeItem(`claimProgress_${company.id}_otpCode`);
      localStorage.removeItem(`claimProgress_${company.id}_otpVerified`);
      localStorage.removeItem(`claimProgress_${company.id}_photoPreview`);
      
      onSuccess(translations?.claimRequestSubmitted || 'Claim request submitted successfully! We will review your request and contact you soon.');
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
      // Validate basic info
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
      
      // Validate password
      if (!formData.password) {
        onError(translations?.passwordRequired || 'Password is required');
        return;
      }
      
      if (formData.password.length < 6) {
        onError(translations?.passwordTooShort || 'Password must be at least 6 characters long');
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        onError(translations?.passwordsDoNotMatch || 'Passwords do not match');
        return;
      }
      
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Validate profile info
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

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (loading || otpSending) {
        // Prevent closing if loading
        return;
      }
      const shouldClose = confirm(translations?.confirmCloseClaim || 'Are you sure you want to close? Your progress will be saved.');
      if (shouldClose) {
        onClose();
      }
    }
  };

  // Navigate to login function
  const navigateToLogin = () => {
    window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
  };

  // Check if user is logged in
  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {translations?.loginRequired || 'Login Required'}
          </h3>
          <p className="text-gray-600 mb-6">
            {translations?.loginToClaimCompany || 'You need to be logged in to claim a company. Please log in to continue.'}
          </p>
          <div className="flex space-x-4 justify-center">
            <button
              onClick={navigateToLogin}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              {translations?.login || 'Login'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all duration-200"
            >
              {translations?.cancel || 'Cancel'}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            handleInputChange={handleInputChange}
            validateEmailDomain={validateEmailDomain}
            handleNextStep={handleNextStep}
            onClose={onClose}
            translations={translations}
          />
        )}
        
        {currentStep === 3 && (
          <Step3Profile
            formData={formData}
            handleInputChange={handleInputChange}
            photoPreview={photoPreview}
            handlePhotoSelect={handlePhotoSelect}
            fileInputRef={fileInputRef}
            loading={loading}
            hasDomainEmail={hasDomainEmail}
            setCurrentStep={setCurrentStep}
            handleNextStep={handleNextStep}
            translations={translations}
          />
        )}
        
        {currentStep === 4 && (
          <Step4OTPVerification
            formData={formData}
            otpCode={otpCode}
            setOtpCode={setOtpCode}
            loading={loading}
            otpSending={otpSending}
            handleSendOTP={handleSendOTP}
            handleVerifyOTP={handleVerifyOTP}
            setCurrentStep={setCurrentStep}
            translations={translations}
          />
        )}
      </div>
    </div>
  );
};

export default ClaimRequestModal;