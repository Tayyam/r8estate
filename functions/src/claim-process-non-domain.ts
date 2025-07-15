import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

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

export const claimProcessNonDomain = functions.https.onCall(async (data, context) => {
  try {
    // Extract data
    const { 
      claimRequestId, // This is new - we'll use it to update the existing request
    } = data;
    
    // Validate required field
    if (!claimRequestId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing claimRequestId'
      );
    }
    
    // Get the existing claim request
    const claimRequestRef = admin.firestore().collection('claimRequests').doc(claimRequestId);
    const claimRequestDoc = await claimRequestRef.get();
    
    if (!claimRequestDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Claim request not found'
      );
    }
    
    // Type assertion to safely access properties
    const claimRequest = claimRequestDoc.data() as {
      businessEmail: string;
      supervisorEmail: string;
      companyId: string;
      companyName: string;
      contactPhone?: string;
      requesterName?: string;
      password?: string;
      supervisorPassword?: string;
      trackingNumber: string;
    };
    
    // Extract data from the existing claim request
    const { 
      businessEmail, 
      supervisorEmail, 
      companyId, 
      companyName,
      contactPhone,
      requesterName,
      password: existingBusinessPassword,
      supervisorPassword: existingSupervisorPassword,
      trackingNumber
    } = claimRequest;
    
    // Validate required fields
    if (!businessEmail || !supervisorEmail || !companyId || !companyName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields in claim request'
      );
    }
    
    // Generate random passwords if not already in the request
    const randomPassword = existingBusinessPassword || generateRandomPassword();
    const supervisorPassword = existingSupervisorPassword || generateRandomPassword();
    
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
    
    // Get current year for copyright
    const currentYear = new Date().getFullYear();
    
    // Generate verification links for both emails
    const businessActionCodeSettings = {
      url: 'https://test.r8estate.com',
      handleCodeInApp: true,
    };
    
    // Supervisor email verification settings - make it identical to business email
    const supervisorActionCodeSettings = {
      url: 'https://test.r8estate.com',
      handleCodeInApp: true,
    };

    try {
      // Create user auth account with business email and random password
      const userRecord = await admin.auth().createUser({
        email: businessEmail,
        password: randomPassword,
        displayName: requesterName || companyName,
        emailVerified: false
      });

      // Create user auth account for supervisor
      const supervisorRecord = await admin.auth().createUser({
        email: supervisorEmail,
        password: supervisorPassword,
        displayName: `${requesterName || companyName} (Supervisor)`,
        emailVerified: false
      });
      
      // Create user document in Firestore as a regular user first
      await admin.firestore().collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: businessEmail,
        displayName: requesterName || companyName,
        role: 'user', // Start as regular user
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        isEmailVerified: false,
        claimRequestId: claimRequestId // Link to claim request
      });

      // Create supervisor user document in Firestore
      await admin.firestore().collection('users').doc(supervisorRecord.uid).set({
        uid: supervisorRecord.uid,
        email: supervisorEmail,
        displayName: `${requesterName || companyName} (Supervisor)`,
        role: 'user', // Start as regular user
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        isEmailVerified: false,
        claimRequestId: claimRequestId,
        isSupervisor: true
      });
      
      // Update claim request with the user ID
      await claimRequestRef.update({
        userId: userRecord.uid,
        supervisorId: supervisorRecord.uid,
        password: randomPassword, // Ensure password is stored
        supervisorPassword: supervisorPassword, // Store supervisor password
        // Don't update domainVerified here!
        updatedAt: new Date()
      });
      
      // Generate email verification links for both users
      const businessEmailLink = await admin.auth().generateEmailVerificationLink(
        businessEmail,
        businessActionCodeSettings
      );

      // Generate supervisor email verification link (use Firebase's built-in verification)
      const supervisorEmailLink = await admin.auth().generateEmailVerificationLink(
        supervisorEmail,
        supervisorActionCodeSettings
      );
      
      // Modify the verification links to include our custom route
      const modifiedBusinessEmailLink = businessEmailLink.replace(
        'https://test.r8estate.com',
        'https://test.r8estate.com/verification'
      );
      
      // Modify supervisor verification link
      const modifiedSupervisorLink = supervisorEmailLink.replace(
        'https://test.r8estate.com',
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
              <p><strong>Your</strong> account has been created with the following credentials:</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Email:</strong> ${businessEmail}</p>
                <p><strong>Password:</strong> ${randomPassword}</p>
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
              <p>An employee from <strong>${companyName}</strong> has requested verification from you.</p>
              <p><strong>Your</strong> account has been created with the following credentials:</p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Email:</strong> ${supervisorEmail}</p>
                <p><strong>Password:</strong> ${supervisorPassword}</p>
              </div>
              <p><strong>Important:</strong> Please save this password. You will need it to log in after verification.</p>
              <p>To verify and approve this request, please click the button below:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${modifiedSupervisorLink}" style="background-color: #194866; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
              </div>
              <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
              <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;"><a href="${modifiedSupervisorLink}">${modifiedSupervisorLink}</a></p>
              <p>Both business email and supervisor email must be verified to complete the company claim process.</p>
              <p>This link will expire in 7 days.</p>
              <p>If you are not a supervisor at ${companyName}, please ignore this email.</p>
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
    console.error('Error in claimProcessNonDomain function:', error);
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to process claim request',
      error
    );
  }
});