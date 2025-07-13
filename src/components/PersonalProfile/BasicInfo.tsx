import React, { useState } from 'react';
import { User, Mail, Save, RefreshCw, Edit, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface BasicInfoProps {
  setError: (message: string) => void;
  setSuccess: (message: string) => void;
}

const BasicInfo: React.FC<BasicInfoProps> = ({ setError, setSuccess }) => {
  const { currentUser, firebaseUser, changeEmailWithoutPassword, sendVerificationEmail } = useAuth();
  const { translations, language, direction } = useLanguage();
  
  const [loading, setLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: currentUser?.displayName || '',
    currentPasswordForEmail: '',
    newEmail: ''
  });

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firebaseUser || !currentUser) {
      setError(translations?.noUserLoggedIn || 'No user logged in');
      return;
    }

    if (!formData.displayName.trim()) {
      setError(translations?.displayNameRequired || 'Display name is required');
      return;
    }

    try {
      setLoading(true);
      
      // Update Firebase profile
      await updateProfile(firebaseUser, {
        displayName: formData.displayName.trim()
      });
      
      // Update Firestore document
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: formData.displayName.trim(),
        updatedAt: new Date()
      });

      setSuccess(translations?.profileUpdatedSuccess || 'Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(translations?.failedToUpdateProfile || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Send email verification
  const handleSendVerification = async () => {
    if (!firebaseUser || !currentUser) {
      setError(translations?.noUserLoggedIn || 'No user logged in');
      return;
    }

    try {
      setVerificationLoading(true);
      
      await sendVerificationEmail(currentUser.email);
      
      setSuccess(translations?.verificationEmailSent || 'Verification email has been sent. Please check your inbox.');
    } catch (error: any) {
      console.error('Error sending verification email:', error);
      setError(translations?.failedToSendVerification || 'Failed to send verification email. Please try again later.');
    } finally {
      setVerificationLoading(false);
    }
  };

  // Change email address
  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.newEmail) {
      setError(translations?.emailRequired || 'Email address is required');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.newEmail)) {
      setError(translations?.invalidEmailFormat || 'Invalid email format');
      return;
    }
    
    try {
      setLoading(true);
      
      // Use the new method to change email without requiring password
      await changeEmailWithoutPassword(formData.newEmail);
      
      // Clear form
      setFormData(prev => ({
        ...prev,
        newEmail: ''
      }));
      
      setShowChangeEmail(false);
      setSuccess(translations?.emailUpdatedSuccess || 'Email updated successfully');
    } catch (error: any) {
      console.error('Error updating email:', error);
      if (error.code === 'auth/wrong-password') {
        setError(translations?.currentPasswordIncorrect || 'Current password is incorrect');
      } else if (error.code === 'auth/email-already-in-use') {
        setError(translations?.emailAlreadyInUse || 'This email is already in use by another account');
      } else if (error.code === 'auth/requires-recent-login') {
        setError(translations?.recentLoginRequired || 'This operation requires a recent login. Please log out and log back in before retrying.');
      } else {
        setError(translations?.failedToUpdateEmail || 'Failed to update email');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 transition-all duration-300 hover:shadow-xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3 rtl:space-x-reverse">
        <User className="h-6 w-6" style={{ color: '#194866' }} />
        <span>{translations?.basicInformation || 'Basic Information'}</span>
      </h2>
      
      <div className="space-y-8">
        {/* Display Name Form */}
        <form onSubmit={handleProfileUpdate} className="space-y-6">
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.fullNameLabel || 'Full Name *'}
              </label>
              <div className="relative">
                <User className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full pl-12 rtl:pr-12 rtl:pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#194866';
                    e.target.style.boxShadow = `0 0 0 3px rgba(25, 72, 102, 0.1)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder={translations?.fullNamePlaceholder || 'Enter your full name'}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 text-white rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 transform hover:translate-y-px"
                style={{ backgroundColor: '#194866' }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save className="h-5 w-5" />
                )}
                <span>{loading ? (translations?.updating || 'Updating...') : (translations?.updateProfile || 'Update Profile')}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Email Address Section */}
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-6 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-green-500 to-blue-500"></div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translations?.emailAddress || 'البريد الإلكتروني'}
            </label>
            
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-grow">
                <div className="relative">
                  <Mail className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="email"
                    value={currentUser?.email || ''}
                    disabled
                    className="w-full pl-12 rtl:pr-12 rtl:pl-4 pr-16 rtl:pl-16 rtl:pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-700"
                    readOnly
                  />
                  {/* Email Verification Badge - RTL-aware positioning */}
                  <div className={`absolute ${direction === 'rtl' ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2`}>
                    {currentUser?.isEmailVerified ? (
                      <div className="bg-green-100 text-green-600 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                        <CheckCircle className={`h-3 w-3 ${direction === 'rtl' ? 'ml-1' : 'mr-1'}`} />
                        <span>{translations?.verified || 'Verified'}</span>
                      </div>
                    ) : (
                      <div className="bg-yellow-100 text-yellow-600 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                        <AlertCircle className={`h-3 w-3 ${direction === 'rtl' ? 'ml-1' : 'mr-1'}`} />
                        <span>{translations?.notVerified || 'Not Verified'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-col sm:flex-row">
                {!currentUser?.isEmailVerified && (
                  <button
                    type="button"
                    onClick={handleSendVerification}
                    disabled={verificationLoading}
                    className="px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-sm hover:shadow-md disabled:opacity-60 whitespace-nowrap"
                  >
                    {verificationLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span>{translations?.sendVerification || 'Send Verification'}</span>
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => setShowChangeEmail(!showChangeEmail)}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-sm hover:shadow-md whitespace-nowrap"
                >
                  <Edit className="h-4 w-4" />
                  <span>{translations?.changeEmail || 'Change Email'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Change Email Form */}
          {showChangeEmail && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-6 animate-fadeIn">
              <form onSubmit={handleEmailChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.newEmailAddress || 'New Email Address *'}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                      type="email"
                      required
                      value={formData.newEmail}
                      onChange={(e) => setFormData({ ...formData, newEmail: e.target.value })}
                      className="w-full pl-12 rtl:pr-12 rtl:pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                      style={{ 
                        focusBorderColor: '#194866',
                        focusRingColor: '#194866'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#194866';
                        e.target.style.boxShadow = `0 0 0 3px rgba(25, 72, 102, 0.1)`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                        e.target.style.boxShadow = 'none';
                      }}
                      placeholder={translations?.enterNewEmail || 'Enter your new email address'}
                    />
                  </div>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-sm text-amber-700 mt-2 mb-4">
                  <AlertCircle className="h-4 w-4 inline-block mr-1" />
                  {translations?.emailChangeWarning || 'You will need to verify your new email address. A verification link will be sent to your new email.'}
                </div>
                
                <div className="flex justify-end space-x-3 rtl:space-x-reverse">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangeEmail(false);
                      setFormData(prev => ({
                        ...prev,
                        newEmail: ''
                      }));
                    }}
                    className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 transition-colors duration-200"
                  >
                    {translations?.cancel || 'Cancel'}
                  </button>
                  
                  <button
                    type="submit"
                    disabled={loading || !formData.newEmail}
                    className="px-6 py-3 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center space-x-2 rtl:space-x-reverse"
                    style={{ backgroundColor: '#194866' }}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Save className="h-5 w-5" />
                    )}
                    <span>
                      {loading 
                        ? (translations?.updatingEmail || 'Updating...') 
                        : (translations?.updateEmail || 'Update Email')
                      }
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default BasicInfo;