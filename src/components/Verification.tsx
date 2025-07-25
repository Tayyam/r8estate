import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '../contexts/AuthContext';

const Verification: React.FC = () => {
  const { translations } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [processingClaim, setProcessingClaim] = useState(false);
  const [autoLoggingIn, setAutoLoggingIn] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Helper function to add debug info
  const addDebugInfo = (info: string) => {
    console.log(info); // Log to console
    setDebugInfo(prev => [...prev, info]); // Add to state for display
  };

  // Auto-login function
  const attemptAutoLogin = async () => {
    const pendingEmail = localStorage.getItem('pendingLoginEmail');
    const pendingPassword = localStorage.getItem('pendingLoginPassword');
    
    if (pendingEmail && pendingPassword) {
      try {
        setAutoLoggingIn(true);
        addDebugInfo(`🔄 Auto-logging in with saved credentials for ${pendingEmail}`);
        
        await login(pendingEmail, pendingPassword);
        
        // Clear the stored credentials after successful login
        localStorage.removeItem('pendingLoginEmail');
        localStorage.removeItem('pendingLoginPassword');
        
        addDebugInfo("✅ Auto-login successful! Redirecting to home page...");
        
        // Redirect to home page after successful login
        setTimeout(() => {
          navigate('/');
        }, 2000);
        
      } catch (loginError) {
        addDebugInfo(`❌ Auto-login failed: ${JSON.stringify(loginError)}`);
        console.error('Auto-login failed:', loginError);
        // Clear invalid credentials
        localStorage.removeItem('pendingLoginEmail');
        localStorage.removeItem('pendingLoginPassword');
      } finally {
        setAutoLoggingIn(false);
      }
    }
  };
  useEffect(() => {
    const verifyEmail = async () => {
      addDebugInfo("🔍 Starting email verification process with debug info enabled");
      try {
        addDebugInfo("🔍 Starting email verification process");
        const searchParams = new URLSearchParams(location.search);
        const mode = searchParams.get('mode');
        const oobCode = searchParams.get('oobCode');

        if (!oobCode) {
          addDebugInfo("❌ No oobCode found in URL");
          setError(translations?.invalidVerificationLink || 'Invalid verification link');
          setLoading(false);
          return;
        }

        // Apply the action code to verify the email
        addDebugInfo("🔍 Checking action code to extract user email...");
        const info = await checkActionCode(auth, oobCode);
        const userEmail = info.data.email;
        addDebugInfo(`📧 Extracted email from oobCode: ${userEmail}`);

        addDebugInfo("🔑 Applying action code to verify email...");
        await applyActionCode(auth, oobCode);
        addDebugInfo("✅ Email verification successful with Firebase Auth");

        if (userEmail) {
          addDebugInfo(`📧 Verified email: ${userEmail}`);
          
          try {
            addDebugInfo("🔄 Handling email verification in the frontend...");
            // Direct implementation instead of calling cloud function
            setProcessingClaim(true);
            await handleEmailVerification(userEmail);
            
            setProcessingClaim(false);
            addDebugInfo("✅ Email verification processing completed");
          } catch (claimError) {
            console.error('Error processing claim verification:', claimError);
            addDebugInfo(`❌ Error processing claim: ${JSON.stringify(claimError)}`);
            // Continue with success flow even if claim processing fails
            setProcessingClaim(false);
          }
        }
        
        setSuccess(true);
        
        // Attempt auto-login after successful verification
        await attemptAutoLogin();
        
        setLoading(false);
      } catch (error) {
        console.error('Error verifying email:', error);
        addDebugInfo(`❌ Error in verification: ${JSON.stringify(error)}`);
        setError(translations?.failedToVerifyEmail || 'Failed to verify email. The link may have expired.');
        setLoading(false);
      }
    };

    verifyEmail();
  }, [location, translations]);

  // New function to handle verification directly
  const handleEmailVerification = async (userEmail: string) => {
    addDebugInfo(`✅ Email verification successful for ${userEmail}`);
    
    try {
      // Find user by email
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', userEmail)
      );
      
      const userSnapshot = await getDocs(usersQuery);
      
      if (!userSnapshot.empty) {
        const userDoc = userSnapshot.docs[0];
        const userId = userDoc.id;
        
        addDebugInfo(`📝 Found user with ID: ${userId}, updating verification status`);
        
        // Update user document with verified status and set to active
        await updateDoc(doc(db, 'users', userId), {
          isEmailVerified: true,
          updatedAt: new Date(),
          status: 'active' // Update status to active after email verification
        });
        
        addDebugInfo("✅ User verification status updated successfully to 'active'");
      } else {
        addDebugInfo("❌ User not found with email: " + userEmail);
      }
    } catch (error) {
      addDebugInfo(`❌ Error updating user status: ${JSON.stringify(error)}`);
      console.error("Error updating user status:", error);
    }

    // Check if this email is associated with a claim request (this part remains the same)
    const businessQuery = query(collection(db, 'claimRequests'), where('businessEmail', '==', userEmail));
    const supervisorQuery = query(collection(db, 'claimRequests'), where('supervisorEmail', '==', userEmail));
    
    const businessResults = await getDocs(businessQuery);
    const supervisorResults = await getDocs(supervisorQuery);
    
    if (!businessResults.empty || !supervisorResults.empty) {
      addDebugInfo(`📊 Found claim request - Business: ${businessResults.size}, Supervisor: ${supervisorResults.size}`);
    
      let claimRequestRef;
      let claimRequest;
      let isSupervisor = false;
      
      // Determine if business or supervisor email
      if (!businessResults.empty) {
        addDebugInfo("✅ Found business email in claim requests");
        claimRequestRef = businessResults.docs[0].ref;
        claimRequest = businessResults.docs[0].data();
        addDebugInfo(`📄 Claim request data: ${JSON.stringify(claimRequest)}`);
        
        // Update business email verified status
        addDebugInfo("🔄 Updating business email verified status to TRUE");
        await updateDoc(claimRequestRef, {
          businessEmailVerified: true,
          updatedAt: new Date()
        });
        addDebugInfo("✅ Business email verified status updated");
        
      } else if (!supervisorResults.empty) {
        addDebugInfo("✅ Found supervisor email in claim requests");
        claimRequestRef = supervisorResults.docs[0].ref;
        claimRequest = supervisorResults.docs[0].data();
        isSupervisor = true;
        addDebugInfo(`📄 Claim request data: ${JSON.stringify(claimRequest)}`);
        
        // Update supervisor email verified status
        addDebugInfo("🔄 Updating supervisor email verified status to TRUE");
        await updateDoc(claimRequestRef, {
          supervisorEmailVerified: true,
          updatedAt: new Date()
        });
        addDebugInfo("✅ Supervisor email verified status updated");
      }
      
      // Get the updated claim request to check both verification statuses
      addDebugInfo("🔄 Getting updated claim request to check both verification statuses");
      const updatedRequest = await getDoc(claimRequestRef);
      const updatedData = updatedRequest.data();
      addDebugInfo(`📄 Updated claim request data: ${JSON.stringify(updatedData)}`);
      
      // Check if both emails are verified
      if (updatedData?.businessEmailVerified && updatedData?.supervisorEmailVerified) {
        addDebugInfo("🎉 Both emails are verified! Updating company status...");
        
        // Update business user role
        if (updatedData.userId) {
          addDebugInfo(`🔄 Updating business user ${updatedData.userId} to company role`);
          await updateDoc(doc(db, 'users', updatedData.userId), {
            role: 'company',
            companyId: updatedData.companyId,
            updatedAt: new Date()
          });
          addDebugInfo("✅ Business user role updated");
        }
        
        // Update supervisor user role
        if (updatedData.supervisorId) {
          addDebugInfo(`🔄 Updating supervisor user ${updatedData.supervisorId} to company role`);
          await updateDoc(doc(db, 'users', updatedData.supervisorId), {
            role: 'company',
            companyId: updatedData.companyId,
            updatedAt: new Date()
          });
          addDebugInfo("✅ Supervisor user role updated");
        }
        
        // Mark company as claimed
        addDebugInfo(`🔄 Marking company ${updatedData.companyId} as claimed`);
        await updateDoc(doc(db, 'companies', updatedData.companyId), {
          claimed: true,
          claimedByName: updatedData.requesterName || 'Unknown',
          updatedAt: new Date()
        });
        addDebugInfo("✅ Company marked as claimed");
        
        // Update claim request status
        addDebugInfo("🔄 Updating claim request status to approved");
        await updateDoc(claimRequestRef, {
          status: 'approved',
          updatedAt: new Date()
        });
        addDebugInfo("✅ Claim request status updated to approved");
        
        addDebugInfo("🎉 Company claimed successfully!");
      } else {
        addDebugInfo(`⏳ ${isSupervisor ? 'Supervisor' : 'Business'} email verified, waiting for other verification`);
      }
    }
  };

  const handleGoToLogin = () => {
    // Clear any pending credentials before going to login
    localStorage.removeItem('pendingLoginEmail');
    localStorage.removeItem('pendingLoginPassword');
    navigate('/login');
  };

  // Check if we have pending credentials for a different display
  const hasPendingCredentials = localStorage.getItem('pendingLoginEmail') && localStorage.getItem('pendingLoginPassword');
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
            {autoLoggingIn && (
              <div className="mb-6">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-blue-600 font-medium">
                  {translations?.signingInNow || 'Signing you in now...'}
                </p>
              </div>
            )}
            <p className="text-gray-600 mb-6">
              {autoLoggingIn 
                ? (translations?.emailVerifiedAutoLogin || 'Your email has been verified! We are signing you in automatically.')
                : (translations?.emailVerifiedMessage || 'Your email has been verified! Please log in to your account.')
              }
            </p>
            
            {/* Debug Information Section */}
            {/* <div className="mt-6 border-t border-gray-200 pt-4">
              <div className="bg-gray-50 p-4 rounded-lg text-left overflow-auto max-h-96">
                <h3 className="font-bold text-red-600 mb-2">Debug Information (will be removed later)</h3>
                <pre className="text-xs overflow-auto whitespace-pre-wrap">
                  {debugInfo.map((info, index) => (
                    <div key={index} className="mb-1 border-b border-dashed border-gray-200 pb-1">
                      {info}
                    </div>
                  ))}
                </pre>
              </div>
            </div> */}

            
            {!autoLoggingIn && (
              <button
                onClick={handleGoToLogin}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
              >
                {translations?.goToLogin || 'Go to Login'}
              </button>
            )}
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
            {hasPendingCredentials ? (
              <div className="space-y-3">
                <button
                  onClick={handleGoToLogin}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
                >
                  {translations?.goToLogin || 'Go to Login'}
                </button>
                <p className="text-sm text-gray-500">
                  {translations?.loginWithRegisteredAccount || 'Login with your registered account'}
                </p>
              </div>
            ) : (
              <button
                onClick={handleGoToLogin}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
              >
                {translations?.goToLogin || 'Go to Login'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Verification;