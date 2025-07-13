import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { applyActionCode } from 'firebase/auth';
import { auth, db, functions } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

const Verification: React.FC = () => {
  const { translations } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [processingClaim, setProcessingClaim] = useState(false);

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const searchParams = new URLSearchParams(location.search);
        const mode = searchParams.get('mode');
        const oobCode = searchParams.get('oobCode');

        if (!oobCode) {
          setError(translations?.invalidVerificationLink || 'Invalid verification link');
          setLoading(false);
          return;
        }

        // Apply the action code to verify the email
        await applyActionCode(auth, oobCode);

        // Get the current user email
        const userEmail = auth.currentUser?.email;
        
        if (userEmail) {
          setProcessingClaim(true);
          
          try {
            // Check if this email is associated with a claim request
            const businessQuery = query(
              collection(db, 'claimRequests'),
              where('businessEmail', '==', userEmail)
            );
            
            const supervisorQuery = query(
              collection(db, 'claimRequests'),
              where('supervisorEmail', '==', userEmail)
            );
            
            const businessResults = await getDocs(businessQuery);
            const supervisorResults = await getDocs(supervisorQuery);
            
            let claimRequest = null;
            let isBusinessEmail = false;
            
            // Check if this is a business email verification
            if (!businessResults.empty) {
              claimRequest = businessResults.docs[0].data();
              isBusinessEmail = true;
              
              // Call the cloud function to update businessEmailVerified
              const checkBusinessEmailVerification = httpsCallable(functions, 'checkBusinessEmailVerification');
              await checkBusinessEmailVerification({
                userId: auth.currentUser?.uid,
                claimRequestId: businessResults.docs[0].id,
                companyId: claimRequest.companyId
              });
            } 
            // Check if this is a supervisor email verification
            else if (!supervisorResults.empty) {
              claimRequest = supervisorResults.docs[0].data();
              
              // Call the cloud function to handle supervisor verification
              const checkBusinessEmailVerification = httpsCallable(functions, 'checkBusinessEmailVerification');
              await checkBusinessEmailVerification({
                userId: auth.currentUser?.uid,
                claimRequestId: supervisorResults.docs[0].id,
                companyId: claimRequest.companyId,
                isSupervisor: true
              });
            }
            
            setProcessingClaim(false);
          } catch (claimError) {
            console.error('Error processing claim verification:', claimError);
            // Continue with success flow even if claim processing fails
            setProcessingClaim(false);
          }
        }
        
        setSuccess(true);
        setLoading(false);
      } catch (error) {
        console.error('Error verifying email:', error);
        setError(translations?.failedToVerifyEmail || 'Failed to verify email. The link may have expired.');
        setLoading(false);
      }
    };

    verifyEmail();
  }, [location, translations]);

  const handleGoToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {loading ? (
          <div>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {translations?.verifyingEmail || 'Verifying Your Email'}
            </h2>
            <p className="text-gray-600 mb-6">
              {translations?.pleaseWait || 'Please wait while we verify your email address...'}
            </p>
          </div>
        ) : success ? (
          <div>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {translations?.emailVerified || 'Email Verified!'}
            </h2>
            {processingClaim && (
              <p className="text-green-600 mb-6">
                {translations?.processingClaimRequest || 'Processing your claim request...'}
              </p>
            )}
            <p className="text-gray-600 mb-6">
              {translations?.emailVerifiedMessage || 'Your email has been verified! Please log in to your account.'}
            </p>
            <button
              onClick={handleGoToLogin}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
            >
              {translations?.goToLogin || 'Go to Login'}
            </button>
          </div>
        ) : (
          <div>
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {translations?.verificationFailed || 'Verification Failed'}
            </h2>
            <p className="text-gray-600 mb-6">
              {error || translations?.genericVerificationError || 'We couldn\'t verify your email. Please try again or request a new verification link.'}
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
}

export default Verification;