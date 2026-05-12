import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Verification: React.FC = () => {
  const { translations } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmailWithToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      if (!token) {
        setError(translations?.invalidVerificationLink || 'Invalid verification link');
        setLoading(false);
        return;
      }
      try {
        await verifyEmailWithToken(token);
        setSuccess(true);
      } catch (e: unknown) {
        setError((e as Error).message || (translations?.failedToVerifyEmail as string));
      } finally {
        setLoading(false);
      }
    };
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for token in URL
  }, []);

  const handleGoToLogin = () => navigate('/login');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {loading ? (
          <div className="py-6">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {translations?.verifyingEmail || 'Verifying Your Email'}
            </h2>
            <p className="text-gray-600 mb-6">
              {translations?.pleaseWait || 'Please wait while we verify your email address...'}
            </p>
          </div>
        ) : success ? (
          <div className="py-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {translations?.emailVerified || 'Email Verified!'}
            </h2>
            <p className="text-gray-600 mb-6">
              {translations?.emailVerifiedMessage ||
                'Your email has been verified! Please log in to your account.'}
            </p>
            <button
              onClick={handleGoToLogin}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
            >
              {translations?.goToLogin || 'Go to Login'}
            </button>
          </div>
        ) : (
          <div className="py-6">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {translations?.verificationFailed || 'Verification Failed'}
            </h2>
            <p className="text-gray-600 mb-6">
              {error ||
                translations?.genericVerificationError ||
                "We couldn't verify your email. Please try again or request a new verification link."}
            </p>
            <button
              onClick={handleGoToLogin}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
            >
              {translations?.goToLogin || 'Go to Login'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Verification;
