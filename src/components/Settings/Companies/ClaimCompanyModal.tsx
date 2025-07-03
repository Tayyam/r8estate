import React, { useState } from 'react';
import { UserPlus, AlertCircle, Lock, Mail, User } from 'lucide-react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Company } from '../../../types/company';

interface ClaimCompanyModalProps {
  company: Company;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ClaimCompanyModal: React.FC<ClaimCompanyModalProps> = ({
  company,
  onClose,
  onSuccess,
  onError
}) => {
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: company.email || '',
    password: '',
    confirmPassword: ''
  });

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      onError(translations?.fillAllFields || 'Please fill in all fields');
      return;
    }
    
    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      onError(translations?.passwordsDoNotMatch || 'Passwords do not match');
      return;
    }
    
    // Validate password length
    if (formData.password.length < 6) {
      onError(translations?.passwordTooShort || 'Password must be at least 6 characters long');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      onError(translations?.invalidEmailFormat || 'Please enter a valid email address');
      return;
    }
    
    try {
      setLoading(true);
      
      // Create user account with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const userId = userCredential.user.uid;
      
      // Create user document in Firestore
      await setDoc(doc(db, 'users', userId), {
        uid: userId,
        email: formData.email,
        displayName: company.name,
        role: 'company',
        companyId: company.id, // Link to company ID
        createdAt: new Date(),
        updatedAt: new Date(),
        isEmailVerified: false
      });
      
      // Update company document to mark as claimed
      await updateDoc(doc(db, 'companies', company.id), {
        claimed: true,
        email: formData.email, // Update company email to match user email
        updatedAt: new Date()
      });
      
      onSuccess(translations?.companyClaimedSuccess || 'Company claimed successfully');
      onClose();
    } catch (error: any) {
      console.error('Error claiming company:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        onError(translations?.emailAlreadyInUse || 'This email address is already in use');
      } else {
        onError(translations?.failedToClaimCompany || 'Failed to claim company');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              {translations?.claimCompany || 'Claim Company'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Information */}
        <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
          <div className="flex items-start space-x-3 rtl:space-x-reverse">
            <AlertCircle className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800">
                {translations?.aboutClaimingCompany || 'About Claiming a Company'}
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                {translations?.claimingCompanyDesc || 
                 'Claiming a company will create a user account that will be associated with this company profile. The user will be able to manage the company profile and respond to reviews.'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translations?.companyName || 'Company Name'}
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={company.name}
                disabled
                className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700"
              />
            </div>
          </div>
          
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translations?.email || 'Email'} *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={translations?.enterEmail || 'Enter email address'}
              />
            </div>
          </div>
          
          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translations?.password || 'Password'} *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={translations?.enterPassword || 'Enter password (min 6 characters)'}
                minLength={6}
              />
            </div>
          </div>
          
          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {translations?.confirmPassword || 'Confirm Password'} *
            </label>
            <div className="relative">
              <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={translations?.confirmPassword || 'Confirm password'}
                minLength={6}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              {translations?.cancel || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 rtl:space-x-reverse"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>{loading ? (translations?.claiming || 'Claiming...') : (translations?.claimCompany || 'Claim Company')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClaimCompanyModal;