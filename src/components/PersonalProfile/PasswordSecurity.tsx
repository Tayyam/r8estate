import React, { useState } from 'react';
import { Key, Lock, Save, Eye, EyeOff } from 'lucide-react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface PasswordSecurityProps {
  setError: (message: string) => void;
  setSuccess: (message: string) => void;
}

const PasswordSecurity: React.FC<PasswordSecurityProps> = ({ setError, setSuccess }) => {
  const { firebaseUser } = useAuth();
  const { translations } = useLanguage();
  
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firebaseUser) {
      setError(translations?.noUserLoggedIn || 'No user logged in');
      return;
    }

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError(translations?.fillAllPasswordFields || 'Please fill in all password fields');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError(translations?.passwordsDoNotMatch || 'New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError(translations?.newPasswordTooShort || 'New password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      
      // Re-authenticate user first
      const credential = EmailAuthProvider.credential(
        firebaseUser.email!,
        formData.currentPassword
      );
      await reauthenticateWithCredential(firebaseUser, credential);
      
      // Update password
      await updatePassword(firebaseUser, formData.newPassword);
      
      // Clear password fields
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setShowChangePassword(false);
      setSuccess(translations?.passwordUpdatedSuccess || 'Password updated successfully');
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password') {
        setError(translations?.currentPasswordIncorrect || 'Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        setError(translations?.newPasswordTooWeak || 'New password is too weak');
      } else {
        setError(translations?.failedToUpdatePassword || 'Failed to update password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 transition-all duration-300 hover:shadow-xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center space-x-3 rtl:space-x-reverse">
        <Key className="h-6 w-6" style={{ color: '#194866' }} />
        <span>{translations?.passwordSecurity || 'Password & Security'}</span>
      </h2>
      
      {!showChangePassword ? (
        <div className="text-center py-8 relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white transition-all duration-300 hover:shadow-md">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 to-blue-500"></div>
          
          <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-purple-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {translations?.changeYourPassword || 'Change Your Password'}
          </h3>
          
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {translations?.passwordSecurityDesc || 'Keep your account secure by updating your password regularly'}
          </p>
          
          <button
            onClick={() => setShowChangePassword(true)}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 text-white rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-xl mx-auto transform hover:-translate-y-1"
            style={{ backgroundColor: '#194866' }}
          >
            <Lock className="h-5 w-5" />
            <span>{translations?.changePassword || 'Change Password'}</span>
          </button>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-6 shadow-sm transition-all duration-300 hover:shadow-md animate-fadeIn">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 to-blue-500"></div>
          
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.currentPassword || 'Current Password *'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    className="w-full pl-12 rtl:pr-12 rtl:pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
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
                    placeholder={translations?.currentPasswordPlaceholder || 'Enter your current password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 rtl:left-4 rtl:right-auto top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.newPassword || 'New Password *'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="w-full pl-12 rtl:pr-12 rtl:pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
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
                    placeholder={translations?.newPasswordPlaceholder || 'Enter new password (min 6 characters)'}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 rtl:left-4 rtl:right-auto top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className={`text-sm flex items-center space-x-2 rtl:space-x-reverse -mt-4 ${
                  formData.newPassword.length >= 6 ? 'text-green-600' : 'text-red-500'
                }`}>
                  {formData.newPassword.length >= 6 ? (
                    <>
                      <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      </div>
                      <span>{translations?.passwordStrengthGood || 'Password length is good'}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>{translations?.passwordTooShort || 'Password must be at least 6 characters'}</span>
                    </>
                  )}
                </div>
              )}

              {/* Confirm New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.confirmNewPassword || 'Confirm New Password *'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
                    placeholder={translations?.confirmNewPasswordPlaceholder || 'Confirm your new password'}
                  />
                </div>
              </div>

              {/* Password Match Indicator */}
              {formData.confirmPassword && (
                <div className={`text-sm flex items-center space-x-2 rtl:space-x-reverse -mt-4 ${
                  formData.newPassword === formData.confirmPassword ? 'text-green-600' : 'text-red-500'
                }`}>
                  {formData.newPassword === formData.confirmPassword ? (
                    <>
                      <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      </div>
                      <span>{translations?.passwordsMatch || 'Passwords match'}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>{translations?.passwordMismatch || 'Passwords do not match'}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 rtl:space-x-reverse pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-3 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 transform hover:-translate-y-1"
                style={{ backgroundColor: '#194866' }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save className="h-5 w-5" />
                )}
                <span>{loading ? (translations?.updating || 'Updating...') : (translations?.updatePassword || 'Update Password')}</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowChangePassword(false);
                  setFormData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
                className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-400 transition-all duration-200 transform hover:-translate-y-1"
              >
                {translations?.cancel || 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      )}

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

export default PasswordSecurity;