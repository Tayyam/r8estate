import React, { useState, useEffect } from 'react';
import { Mail, X, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

interface EmailVerificationModalProps {
  email: string;
  onClose: () => void;
  isOpen: boolean;
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  email,
  onClose,
  isOpen
}) => {
  const { translations } = useLanguage();
  const { sendVerificationEmail } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCountdown(60); // Reset countdown to 60 seconds when modal opens
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: number | null = null;
    if (countdown > 0) {
      timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  // Handle resend verification email
  const handleResendVerification = async () => {
    try {
      setResendLoading(true);
      setResendError('');
      
      await sendVerificationEmail(email);
      
      setResendSuccess(true);
      setCountdown(60); // Reset countdown after successful resend
      
      setTimeout(() => {
        setResendSuccess(false);
      }, 5000);
    } catch (error: any) {
      console.error('Error resending verification:', error);
      setResendError(translations?.failedToSendVerification || 'Failed to send verification email. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  if (!isOpen) return null;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="h-10 w-10 text-blue-600" />
          </div>
          
          <h3 className="text-2xl font-bold mb-4 text-gray-900">
            {translations?.verifyYourEmail || 'Verify Your Email'}
          </h3>
          
          <p className="text-gray-600 mb-8">
            {translations?.verificationEmailSentDesc || `A verification email has been sent to ${email}. Please check your inbox and verify your email address to activate your account.`}
          </p>

          {resendSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              <p className="text-green-700 text-sm">
                {translations?.verificationEmailResent || 'Verification email resent! Please check your inbox.'}
              </p>
            </div>
          )}

          {resendError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <p className="text-red-700 text-sm">{resendError}</p>
            </div>
          )}

          <div className="flex flex-col space-y-4">
            <button
              onClick={handleResendVerification}
              disabled={resendLoading || countdown > 0}
              className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors duration-200"
            >
              {resendLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
              <span>
                {resendLoading 
                  ? (translations?.sending || 'Sending...') 
                  : countdown > 0
                    ? `${translations?.resendIn || 'Resend in'} ${countdown}s`
                    : (translations?.resendVerificationEmail || 'Resend Verification Email')
                }
              </span>
            </button>

            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors duration-200"
            >
              {translations?.close || 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationModal;