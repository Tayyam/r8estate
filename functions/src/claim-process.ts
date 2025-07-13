import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';
import { Request, Response } from 'express';

const RESEND_API_KEY = 're_ZfaXVLi3_94WMKpGCx5XhSkKcQNFsX9nw';
const resend = new Resend(RESEND_API_KEY);

// Generate a random 9-digit password
function generateRandomPassword(): string {
  const digits = '0123456789';
  let password = '';
  for (let i = 0; i < 9; i++) {
    password += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return password;
}

export const claimProcess = functions.https.onCall(async (data, context) => {
  try {
    // Extract data
    const { 
      businessEmail, 
      supervisorEmail, 
      companyId, 
      companyName,
      contactPhone,
      displayName 
    } = data;
    
    // Validate required fields
    if (!businessEmail || !supervisorEmail || !companyId || !companyName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields'
      );
    }
    
    // Generate random password for the account
    const randomPassword = generateRandomPassword();
    
    // Check if company exists
    const companyRef = admin.firestore().collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();
    if (!companyDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Company not found'
      );
    }
    
    // Check if company is already claimed
    if (companyDoc.data()?.claimed) {
      throw new functions.https.HttpsError(
        'already-exists',
        'This company has already been claimed'
      );
    }
    
    // Create tracking number for claim request
    const trackingNumber = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Create claim request in database
    const claimRequestRef = await admin.firestore().collection('claimRequests').add({
      companyId,
      companyName,
      requesterId: context.auth ? context.auth.uid : null,
      requesterName: displayName || 'Guest User',
      businessEmail,
      supervisorEmail,
      contactPhone: contactPhone || '',
      password: randomPassword, // Store the random password for admin to use if needed
      status: 'pending',
      trackingNumber,
      businessEmailVerified: false,
      supervisorEmailVerified: false,
      domainVerified: true, // Since this is a domain-based claim
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Get current year for copyright
    const currentYear = new Date().getFullYear();
    
    // Generate verification links for both emails
    const businessActionCodeSettings = {
      url: 'https://test.r8estate.com',
      handleCodeInApp: true,
    };
    
    try {
      // Create user auth account with business email and random password
      const userRecord = await admin.auth().createUser({
        email: businessEmail,
        password: randomPassword,
        displayName: displayName || companyName,
        emailVerified: false
      });
      
      // Create user document in Firestore as a regular user first
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: businessEmail,
        displayName: displayName || companyName,
        role: 'user', // Start as regular user
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        isEmailVerified: false,
        claimRequestId: claimRequestRef.id // Link to claim request
      });
      
      // Update claim request with the user ID
      await claimRequestRef.update({
        userId: userRecord.uid
      });
      
      // Generate email verification links
      const businessEmailLink = await admin.auth().generateEmailVerificationLink(
        businessEmail,
        businessActionCodeSettings
      );
      
      // Generate custom verification link for supervisor
      // We can't use Firebase's built-in verification for the supervisor
      // since they don't have an account, so we'll create a custom token
      const supervisorToken = admin.firestore().collection('verificationTokens').doc();
      await supervisorToken.set({
        email: supervisorEmail,
        claimRequestId: claimRequestRef.id,
        companyId: companyId,
        businessEmail: businessEmail,
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        ),
        used: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const supervisorVerificationLink = `https://test.r8estate.com/verify-supervisor?token=${supervisorToken.id}&companyId=${companyId}`;
      
      // Modify the verification links to include our custom route
      const modifiedBusinessEmailLink = businessEmailLink.replace(
        'https://test.r8estate.com',
        'https://test.r8estate.com/verification'
      );
      
      // Modify the supervisor verification link as well
      const modifiedSupervisorLink = supervisorVerificationLink.replace(
        'https://test.r8estate.com/verify-supervisor',
        'https://test.r8estate.com/verification'
      );

      // Send batch emails using Resend
      const emailBatch = [
        {
          from: 'R8 Estate <support@r8estate.com>',
          to: [businessEmail],
          subject: `Verify Your Email for ${companyName} Company Claim`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <img src="https://i.ibb.co/hx0kCnf4/R8ESTATE.png" alt="R8 Estate Logo" style="width: 100px; height: auto; border-radius: 10%;">
                <h1 style="color: #194866; margin-top: 20px;">Verify Your Business Email</h1>
              </div>
              <p>You're in the process of claiming <strong>${companyName}</strong> on R8 Estate.</p>
              <p>Your account has been created with the following credentials:</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Email:</strong> ${businessEmail}</p>
                <p><strong>Temporary Password:</strong> ${randomPassword}</p>
              </div>
              <p><strong>Important:</strong> Please save this password. You will need it to log in after verification.</p>
              <p>To verify your email address and continue the claim process, please click the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${modifiedBusinessEmailLink}" style="background-color: #194866; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
              </div>
              <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
              <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;"><a href="${modifiedBusinessEmailLink}">${modifiedBusinessEmailLink}</a></p>
              <p>Both business email and supervisor email must be verified to complete the company claim process.</p>
              <p>This link will expire in 7 days.</p>
              <p>If you didn't request to claim this company, you can ignore this email.</p>
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
                <p>&copy; ${currentYear} R8 Estate. All rights reserved.</p>
              </div>
            </div>
          `
        },
        {
          from: 'R8 Estate <support@r8estate.com>',
          to: [supervisorEmail],
          subject: `Supervisor Verification for ${companyName} Company Claim`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <img src="https://i.ibb.co/hx0kCnf4/R8ESTATE.png" alt="R8 Estate Logo" style="width: 100px; height: auto; border-radius: 10%;">
                <h1 style="color: #194866; margin-top: 20px;">Supervisor Verification</h1>
              </div>
              <p>Someone is attempting to claim <strong>${companyName}</strong> on R8 Estate.</p>
              <p>As a supervisor, your verification is required to approve this claim request.</p>
              <p>The business email <strong>${businessEmail}</strong> has requested to claim this company.</p>
              <p>The login credentials for the company account (after verification) will be:</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Email:</strong> ${businessEmail}</p>
                <p><strong>Temporary Password:</strong> ${randomPassword}</p>
              </div>
              <p>To approve this request, please click the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${modifiedSupervisorLink}" style="background-color: #194866; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify as Supervisor</a>
              </div>
              <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
              <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;"><a href="${modifiedSupervisorLink}">${modifiedSupervisorLink}</a></p>
              <p>Both business email and supervisor email must be verified to complete the company claim process.</p>
              <p>This link will expire in 7 days.</p>
              <p>If you weren't expecting this verification request, please ignore this email.</p>
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
                <p>&copy; ${currentYear} R8 Estate. All rights reserved.</p>
              </div>
            </div>
          `
        }
      ];

      // Send batch emails
      await resend.emails.send(emailBatch[0]);
      await resend.emails.send(emailBatch[1]);

      return { 
        success: true, 
        message: 'Verification emails sent successfully',
        trackingNumber
      };
    } catch (error: any) {
      console.error('Error in claim process:', error);
      
      // Clean up if user was created but emails failed
      try {
        if (error.user && error.user.uid) {
          await admin.auth().deleteUser(error.user.uid);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up after failed claim process:', cleanupError);
      }
      
      throw new functions.https.HttpsError(
        'internal',
        'Failed to process claim request',
        error
      );
    }
  } catch (error: any) {
    console.error('Error in claimProcess function:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to process claim request',
      error
    );
  }
});

// Verify supervisor email function
export const verifySupervisor = functions.https.onRequest(async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, companyId } = req.query;
    
    if (!token || !companyId) {
      res.status(400).send('Missing required parameters');
      return;
    }
    
    // Get token document
    const tokenDoc = await admin.firestore().collection('verificationTokens').doc(String(token)).get();
    
    if (!tokenDoc.exists) {
      res.status(404).send('Invalid or expired verification token');
      return;
    }
    
    const tokenData = tokenDoc.data();
    
    // Check if token is expired
    if (tokenData?.expiresAt.toDate() < new Date()) {
      res.status(400).send('Verification token has expired');
      return;
    }
    
    // Check if token is already used
    if (tokenData?.used) {
      res.status(400).send('Verification token has already been used');
      return;
    }
    
    // Find claim request
    const claimRequestId = tokenData?.claimRequestId;
    const claimRequestRef = admin.firestore().collection('claimRequests').doc(claimRequestId);
    const claimRequestDoc = await claimRequestRef.get();
    
    if (!claimRequestDoc.exists) {
      res.status(404).send('Claim request not found');
      return;
    }
    
    const claimRequestData = claimRequestDoc.data();
    
    // Mark supervisor email as verified
    await claimRequestRef.update({
      supervisorEmailVerified: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Mark token as used
    await tokenDoc.ref.update({
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Check if both emails are now verified
    if (claimRequestData?.businessEmailVerified) {
      // Both emails are verified, we can now claim the company
      
      // Get user document
      const userDoc = await admin.firestore().collection('users').doc(claimRequestData.userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        // Update user to company role
        await userDoc.ref.update({
          role: 'company',
          companyId: companyId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Mark company as claimed
        await admin.firestore().collection('companies').doc(String(companyId)).update({
          claimed: true,
          claimedByName: userData?.displayName || 'Unknown User',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Mark claim request as approved
        await claimRequestRef.update({
          status: 'approved',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    
    // Redirect to success page
    res.redirect('/verification?type=supervisor');
  } catch (error) {
    console.error('Error verifying supervisor:', error);
    res.status(500).send('An error occurred while verifying supervisor email');
  }
});

// Function to check if business email is verified and update claim if both are verified
export const checkBusinessEmailVerification = functions.https.onCall(async (data, context) => {
  try {
    const { userId, claimRequestId, companyId } = data;
    
    if (!userId || !claimRequestId || !companyId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields'
      );
    }
    
    // Get user
    const user = await admin.auth().getUser(userId);
    
    if (!user.emailVerified) {
      return { 
        success: false, 
        message: 'Business email is not verified yet' 
      };
    }
    
    // Get claim request
    const claimRequestRef = admin.firestore().collection('claimRequests').doc(claimRequestId);
    const claimRequestDoc = await claimRequestRef.get();
    
    if (!claimRequestDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Claim request not found'
      );
    }
    
    // Update business email verified status
    await claimRequestRef.update({
      businessEmailVerified: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Check if supervisor email is also verified
    const updatedClaimRequest = await claimRequestRef.get();
    const claimData = updatedClaimRequest.data();
    
    if (claimData?.supervisorEmailVerified) {
      // Both emails are verified, update user role and claim company
      await admin.firestore().collection('users').doc(userId).update({
        role: 'company',
        companyId: companyId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Mark company as claimed
      await admin.firestore().collection('companies').doc(companyId).update({
        claimed: true,
        claimedByName: user.displayName,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Mark claim request as approved
      await claimRequestRef.update({
        status: 'approved',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { 
        success: true, 
        message: 'Company claimed successfully',
        bothVerified: true
      };
    }
    
    return { 
      success: true, 
      message: 'Business email verified successfully. Waiting for supervisor verification.',
      bothVerified: false
    };
    
  } catch (error: any) {
    console.error('Error checking business email verification:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to check business email verification',
      error
    );
  }
});