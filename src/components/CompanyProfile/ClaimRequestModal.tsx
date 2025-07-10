import React, { useState, useEffect } from 'react';
import { Building2, X, AlertCircle } from 'lucide-react';
import { collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp, doc, setDoc } from 'firebase/firestore';
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
import LoginPrompt from './ClaimRequestModal/LoginPrompt';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
export default ClaimRequestModal;