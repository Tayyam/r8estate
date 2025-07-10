import React, { useState, useEffect } from 'react';
import { Building2, Phone, Mail, Send, X, AlertCircle, Check, RefreshCw, Globe, Lock, User, Camera } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, auth, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile } from '../../types/companyProfile';
import { sendOTPVerificationEmail } from '../../utils/emailUtils';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  const [savedDomainChoice, setSavedDomainChoice] = useState<boolean | null>(null);
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
  
  // OTP and password state
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [password, setPassword] = useState('');
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
  
  // File input ref for photo upload
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
    // Try to get saved form data from localStorage
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

  // Save progress when any state changes
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
    setSavedDomainChoice(hasDomain);
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
      // Send OTP email via Resend API
      const sent = await sendOTPVerificationEmail(email, otp, company.name);
      
      if (!sent) {
        console.error("Failed to send OTP email with Resend API");
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
        await addDoc(collection(db, 'users'), {
          uid: user.uid,
          displayName: formData.displayName,
          email: formData.businessEmail,
          photoURL: photoURL,
          role: 'user', // Initially user role
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (hasDomainEmail) {
      if (!formData.businessEmail) {
        onError(translations?.emailRequired || 'Email address is required');
        return;
      }
    } else {
      if (!formData.contactPhone || !formData.businessEmail) {
        onError(translations?.fillAllFields || 'Please fill in all required fields');
        return;
      }
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.businessEmail)) {
      onError(translations?.invalidEmailFormat || 'Please enter valid email addresses');
      return;
    }
    
    // Move to the next step
    setCurrentStep(3);
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

  // Navigate to login
  const navigateToLogin = () => {
    // Save the current URL to return to after login
    window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
  };
  
  // Redirect to login if not logged in
  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="h-8 w-8 text-blue-600" />
          </div>
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

        {/* Step 1: Domain Selection */}
        {currentStep === 1 && (
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
        )}
        
        {/* Step 2: Email & Password */}
        {currentStep === 2 && (
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
              
              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.password || 'Password'} *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={translations?.enterPassword || 'Enter password (min. 6 characters)'}
                    minLength={6}
                  />
                </div>
              </div>
              
              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.confirmPassword || 'Confirm Password'} *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={translations?.confirmPassword || 'Confirm password'}
                  />
                </div>
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
        )}
        
        {/* Step 3: Profile Info */}
        {currentStep === 3 && (
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
        )}
        
        {/* Step 4: OTP Verification */}
        {currentStep === 4 && (
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
        
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {translations?.back || 'Back'}
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
                    : (translations?.verifyAndSubmit || 'Verify & Submit')
                  }
                </span>
              </button>
        </div>
      </div>
        )}
      </div>
    </div>
  );
};

export default ClaimRequestModal;