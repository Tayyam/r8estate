import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { applyActionCode } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

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
            // Direct implementation instead of calling cloud function
            await handleEmailVerification(userEmail);
            
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

  // New function to handle verification directly
  const handleEmailVerification = async (userEmail: string) => {
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
    
    let claimRequestRef;
    let claimRequest;
    let isSupervisor = false;
    
    // Determine if business or supervisor email
    if (!businessResults.empty) {
      claimRequestRef = businessResults.docs[0].ref;
      claimRequest = businessResults.docs[0].data();
      
      // Update business email verified status
      await updateDoc(claimRequestRef, {
        businessEmailVerified: true,
        updatedAt: new Date()
      });
      
    } else if (!supervisorResults.empty) {
      claimRequestRef = supervisorResults.docs[0].ref;
      claimRequest = supervisorResults.docs[0].data();
      isSupervisor = true;
      
      // Update supervisor email verified status
      await updateDoc(claimRequestRef, {
        supervisorEmailVerified: true,
        updatedAt: new Date()
      });
    } else {
      // Not a claim request email
      return;
    }
    
    // Get the updated claim request to check both verification statuses
    const updatedRequest = await getDoc(claimRequestRef);
    const updatedData = updatedRequest.data();
    
    // Check if both emails are verified
    if (updatedData?.businessEmailVerified && updatedData?.supervisorEmailVerified) {
      console.log("Both emails verified, updating company status...");
      
      // Update business user role
      if (updatedData.userId) {
        await updateDoc(doc(db, 'users', updatedData.userId), {
          role: 'company',
          companyId: updatedData.companyId,
          updatedAt: new Date()
        });
      }
      
      // Update supervisor user role
      if (updatedData.supervisorId) {
        await updateDoc(doc(db, 'users', updatedData.supervisorId), {
          role: 'company',
          companyId: updatedData.companyId,
          updatedAt: new Date()
        });
      }
      
      // Mark company as claimed
      await updateDoc(doc(db, 'companies', updatedData.companyId), {
        claimed: true,
        claimedByName: updatedData.requesterName || 'Unknown',
        email: updatedData.businessEmail,
        updatedAt: new Date()
      });
      
      // Update claim request status
      await updateDoc(claimRequestRef, {
        status: 'approved',
        updatedAt: new Date()
      });
      
      console.log("Company claimed successfully");
    } else {
      console.log(`${isSupervisor ? 'Supervisor' : 'Business'} email verified, waiting for other verification`);
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

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
          <div className="py-6">
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