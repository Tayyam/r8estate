import React, { useState, useEffect } from 'react';
import { AlertOctagon, Mail } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';
import { useNotification } from '../contexts/NotificationContext';

const UnverifiedUserView = () => {
  const { translations } = useLanguage();
  const { logout, currentUser } = useAuth();
  const { showSuccessToast, showErrorToast } = useNotification();
  const [sending, setSending] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const handleResendVerification = async () => {
    if (!currentUser?.email) return;
    
    try {
      setSending(true);
      
      const sendVerificationEmailFunction = httpsCallable(functions, 'sendVerificationEmail');
      await sendVerificationEmailFunction({ email: currentUser.email });
      
      showSuccessToast(
        translations?.verificationEmailResent || 'Verification Email Resent',
        translations?.verificationEmailResentDesc || 'We have sent another verification email to your inbox. Please check your email and click on the verification link.'
      );
    } catch (error) {
      console.error('Error resending verification email:', error);
      showErrorToast(
        translations?.error || 'Error',
        translations?.failedToSendVerification || 'Failed to send verification email. Please try again later.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertOctagon className="h-10 w-10 text-yellow-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {translations?.accountNotVerified || 'Account Not Verified'}
        </h2>
        
        <p className="text-gray-600 mb-6 text-lg">
          {translations?.pleaseVerifyAccountMessage || 
           'Please verify your email address to access all features. Check your inbox for a verification link.'}
        </p>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-4 mb-8">
          <button
            onClick={handleResendVerification}
            disabled={sending}
            className="inline-flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : (
              <Mail className="h-5 w-5 mr-2" />
            )}
            <span>{sending ? 
              (translations?.sending || 'Sending...') : 
              (translations?.resendVerification || 'Resend Verification Email')}
            </span>
          </button>
          
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {translations?.logout || 'Logout'}
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          <p>{translations?.accountNotVerifiedExplanation || 'If you don\'t see the verification email, please check your spam folder or try resending it.'}</p>
          <p className="mt-2">Email: {currentUser?.email}</p>
        </div>
      </div>
    </div>
  );
};

export default UnverifiedUserView;