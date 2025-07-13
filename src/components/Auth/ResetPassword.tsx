import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

const ResetPassword = () => {
  const { translations, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [actionCode, setActionCode] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Parse query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    // Verify this is a password reset
    if (mode === 'resetPassword' && oobCode) {
      setActionCode(oobCode);
      verifyResetCode(oobCode);
    } else {
      setError(translations?.invalidResetLink || 'Invalid password reset link');
      setVerifying(false);
    }
  }, [location]);

  // Verify the reset code is valid
  const verifyResetCode = async (oobCode: string) => {
    try {
      await verifyPasswordResetCode(auth, oobCode);
      setVerified(true);
      setVerifying(false);
    } catch (err) {
      console.error('Error verifying reset code:', err);
      setError(translations?.invalidOrExpiredLink || 'Invalid or expired reset link. Please request a new one.');
      setVerifying(false);
    }
  };

  // Handle password reset submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (newPassword !== confirmPassword) {
      setError(translations?.passwordsDoNotMatch || 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError(translations?.passwordTooShort || 'Password must be at least 6 characters long');
      return;
    }

    if (!actionCode) {
      setError(translations?.missingActionCode || 'Missing action code');
      return;
    }

    try {
      setSubmitting(true);
      await confirmPasswordReset(auth, actionCode, newPassword);
      setResetSuccess(true);
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(translations?.passwordResetFailed || 'Failed to reset password. Please try again or request a new link.');
    } finally {
      setSubmitting(false);
    }
  };

  // Navigate back to login
  const goToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="https://i.ibb.co/hx0kCnf4/R8ESTATE.png" 
              alt="R8ESTATE Logo" 
              className="w-12 h-12 object-contain rounded-full mr-3"
            />
            <div className="text-2xl font-bold">
              <span style={{ color: '#EE183F' }}>R8</span>
              <span style={{ color: '#194866' }}>ESTATE</span>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold mb-2" style={{ color: '#194866' }}>
            {translations?.resetPassword || 'Reset Password'}
          </h2>
          <p className="text-gray-600">
            {translations?.createNewPassword || 'Create a new password for your account'}
          </p>
        </div>
        
        {/* Loading state */}
        {verifying && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">{translations?.verifyingLink || 'Verifying your reset link...'}</p>
          </div>
        )}
        
        {/* Error state */}
        {error && !verifying && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-red-800 mb-2">{translations?.linkError || 'Link Error'}</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={goToLogin}
              className="mt-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium transition-all duration-200 hover:bg-blue-700 flex items-center justify-center mx-auto"
              style={{ backgroundColor: '#194866' }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span>{translations?.backToLogin || 'Back to Login'}</span>
            </button>
          </div>
        )}
        
        {/* Success state */}
        {resetSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-green-800 mb-2">
              {translations?.passwordResetSuccess || 'Password Reset Successful!'}
            </h3>
            <p className="text-green-700 mb-4">
              {translations?.passwordResetSuccessDesc || 'Your password has been successfully reset. You can now log in with your new password.'}
            </p>
            <button
              onClick={goToLogin}
              className="mt-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium transition-all duration-200 hover:bg-green-700"
            >
              <span>{translations?.goToLogin || 'Go to Login'}</span>
            </button>
          </div>
        )}
        
        {/* Password reset form */}
        {verified && !resetSuccess && (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="new-password">
                {translations?.newPassword || 'New Password'} *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="new-password"
                  name="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder={translations?.enterNewPassword || 'Enter new password (min 6 characters)'}
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            {/* Confirm New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="confirm-password">
                {translations?.confirmPassword || 'Confirm Password'} *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder={translations?.confirmNewPassword || 'Confirm your new password'}
                />
              </div>
            </div>
            
            {/* Password validation indicators */}
            <div className="space-y-2">
              {newPassword && (
                <div className={`text-sm flex items-center space-x-2 rtl:space-x-reverse ${
                  newPassword.length >= 6 ? 'text-green-600' : 'text-red-500'
                }`}>
                  {newPassword.length >= 6 ? (
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
              
              {confirmPassword && (
                <div className={`text-sm flex items-center space-x-2 rtl:space-x-reverse ${
                  newPassword === confirmPassword ? 'text-green-600' : 'text-red-500'
                }`}>
                  {newPassword === confirmPassword ? (
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
            
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting || newPassword.length < 6 || newPassword !== confirmPassword}
                className="w-full text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#194866' }}
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>{translations?.resetPassword || 'Reset Password'}</span>
                )}
              </button>
            </div>
            
            <div className="text-center pt-4">
              <button
                type="button"
                onClick={goToLogin}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {translations?.backToLogin || 'Back to Login'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;