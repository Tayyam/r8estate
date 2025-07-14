import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext'; 
import { functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { useLanguage } from '../contexts/LanguageContext'; 
import { CheckCircle, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

const Verification: React.FC = () => {
  const { translations } = useLanguage();
  const { firebaseUser } = useAuth();
  const oobCodeRef = useRef<string | null>(null);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [processingClaim, setProcessingClaim] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Reference to admin for user lookup
  const admin = {
    auth: () => ({
      getUserByEmail: async (email: string) => {
        // We can't directly use admin.auth() in the frontend, so we'll do a Firestore lookup instead
        try {
          const usersQuery = query(
            collection(db, 'users'),
            where('email', '==', email)
          );
          const userSnapshot = await getDocs(usersQuery);
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            return {
              uid: userSnapshot.docs[0].id,
              displayName: userData.displayName || '',
              email: userData.email
            };
          }
          return null;
        } catch (error) {
          console.error("Error looking up user by email:", error);
          return null;
        }
      }
    })
  };

  // Helper function to add debug info
  const addDebugInfo = (info: string) => {
    console.log(info); // Log to console
    setDebugInfo(prev => [...prev, info]); // Add to state for display
  };

  useEffect(() => {
    const verifyEmail = async () => {
      addDebugInfo("🔍 Starting email verification process with debug info enabled");
      try {
        addDebugInfo("🔍 Starting email verification process");
        const searchParams = new URLSearchParams(location.search);
        const mode = searchParams.get('mode');
        const oobCode = searchParams.get('oobCode');
        oobCodeRef.current = oobCode;

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
        setVerifiedEmail(userEmail);
        addDebugInfo(`📧 Extracted email from oobCode: ${userEmail}`);

        addDebugInfo("🔑 Applying action code to verify email...");
        await applyActionCode(auth, oobCode);
        addDebugInfo("✅ Email verification successful with Firebase Auth");

        if (userEmail) {
          addDebugInfo(`📧 Verified email: ${userEmail}`);
          
          // First, try to look up the user by email
          addDebugInfo(`🔍 Looking up user by email: ${userEmail}`);
          const userDoc = await admin.auth().getUserByEmail(userEmail);
          
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
    addDebugInfo(`🔍 Using email from previous checkActionCode: ${userEmail}`);
    
    // Check if this email is associated with a claim request
    const businessQuery = query(
      collection(db, 'claimRequests'),
      where('businessEmail', '==', userEmail)
    );
    
    const supervisorQuery = query(
      collection(db, 'claimRequests'),
      where('supervisorEmail', '==', userEmail)
    );
    
    addDebugInfo("🔎 Running queries for business and supervisor emails");
    const businessResults = await getDocs(businessQuery);
    const supervisorResults = await getDocs(supervisorQuery);
    addDebugInfo(`📊 Results - Business: ${businessResults.size}, Supervisor: ${supervisorResults.size}`);
    
    // Check if this is a regular user registration (not a claim request)
    if (businessResults.empty && supervisorResults.empty) {
      addDebugInfo("👤 Regular user registration detected (not a claim request)");
      
      // Call the Cloud Function to create the user document
      addDebugInfo("☁️ Calling createVerifiedUser Cloud Function");
      try {
        // Lookup the user by email first
        const userDoc = await admin.auth().getUserByEmail(userEmail);
        addDebugInfo(`📦 UserDoc from lookup: ${JSON.stringify(userDoc || 'Not found')}`);

        if (userDoc && userDoc.uid && userEmail) {
          addDebugInfo(`📦 Calling cloud function with: uid=${userDoc.uid}, email=${userEmail}, displayName=${userDoc.displayName || ''}`);
          // Call our Cloud Function to create the user document
          const createUserDoc = httpsCallable(functions, 'createVerifiedUser');
          const result = await createUserDoc({ 
            uid: userDoc.uid, 
            email: userEmail,
            displayName: userDoc.displayName || ''
          });
          
          const data = result.data as any;
          if (data.success) {
            addDebugInfo("✅ User document created successfully via Cloud Function");
          } else {
            throw new Error(data.message || 'Failed to create user document');
          }
        } else {
          addDebugInfo("❌ User document or email is missing - cannot create user document");
          addDebugInfo(`ℹ️ Available data: userDoc=${!!userDoc}, userEmail=${!!userEmail}`);
        }
      } catch (error) {
        addDebugInfo(`❌ Error calling createVerifiedUser function: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      }
      
      return;
    }
    
    let claimRequestRef;
    let claimRequest;
    let isSupervisor = false;
    
    // Determine if business or supervisor email
    if (!businessResults.empty) {
      addDebugInfo(`✅ Found business email in claim requests: ${userEmail}`);
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
      addDebugInfo(`✅ Found supervisor email in claim requests: ${userEmail}`);
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
    } else {
      // Not a claim request email
      addDebugInfo("ℹ️ Not a claim request email");
      return;
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
        email: updatedData.businessEmail,
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
            
            {/* Debug Information Section */}
            <div className="mt-6 border-t border-gray-200 pt-4">
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
            </div>
            
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