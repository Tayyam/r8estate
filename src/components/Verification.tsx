import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

const Verification: React.FC = () => {
  const { translations } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        setVerifying(true);
        
        // Parse query parameters
        const searchParams = new URLSearchParams(location.search);
        const mode = searchParams.get('mode');
        const oobCode = searchParams.get('oobCode');
        
        if (!oobCode || mode !== 'verifyEmail') {
          setError(translations?.invalidVerificationLink || 'Invalid verification link');
          setVerifying(false);
          return;
        }
        
        // Call the verifyEmail cloud function
        const verifyEmailFunction = httpsCallable(functions, 'verifyEmail');
        const result = await verifyEmailFunction({ oobCode });
        
        const data = result.data as any;
        
        if (data.success) {
          setSuccess(true);
          // Reload the current user if they're logged in
          if (auth.currentUser) {
            await auth.currentUser.reload();
          }
        } else {
          setError(data.message || translations?.verificationFailed || 'Verification failed');
        }
      } catch (error: any) {
        console.error('Error verifying email:', error);
        
        // Handle specific error codes
        if (error.code === 'not-found' || error.message.includes('not-found')) {
          setError(translations?.invalidVerificationCode || 'Invalid verification code');
        } else if (error.code === 'deadline-exceeded' || error.message.includes('expired')) {
          setError(translations?.verificationExpired || 'Verification link has expired');
        } else if (error.code === 'already-exists' || error.message.includes('already been used')) {
          setError(translations?.verificationAlreadyUsed || 'This verification link has already been used');
        } else {
          setError(translations?.verificationError || 'An error occurred during verification');
        }
      } finally {
        setVerifying(false);
      }
    };

    verifyEmail();
  }, [location.search]);

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="text-center mb-8">
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
            {translations?.emailVerification || 'Email Verification'}
          </h2>
        </div>
        
        {/* Content */}
        <div className="text-center">
          {verifying ? (
            <>
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-gray-600">{translations?.verifyingEmail || 'Verifying your email...'}</p>
            </>
          ) : success ? (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {translations?.verificationSuccess || 'Email Verified!'}
              </h3>
              <p className="text-gray-600 mb-8">
                {translations?.verificationSuccessMessage || 'Your email has been successfully verified. You can now log in to your account.'}
              </p>
              <button
                onClick={handleBackToLogin}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 hover:bg-blue-700"
                style={{ backgroundColor: '#194866' }}
              >
                {translations?.goToLogin || 'Go to Login'}
              </button>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {translations?.verificationFailed || 'Verification Failed'}
              </h3>
              <p className="text-gray-600 mb-8">
                {error || translations?.verificationErrorMessage || 'We could not verify your email. The link may be invalid or expired.'}
              </p>
              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleBackToLogin}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium transition-all duration-200 hover:bg-blue-700"
                  style={{ backgroundColor: '#194866' }}
                >
                  {translations?.goToLogin || 'Go to Login'}
                </button>
                <button
                  onClick={handleBackToHome}
                  className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse py-3 px-6 bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 hover:bg-gray-300"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>{translations?.backToHome || 'Back to Home'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Verification;