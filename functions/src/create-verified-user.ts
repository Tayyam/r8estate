import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

const RESEND_API_KEY = 're_ZfaXVLi3_94WMKpGCx5XhSkKcQNFsX9nw';
const resend = new Resend(RESEND_API_KEY);

export const createVerifiedUser = functions.https.onCall(async (data, context) => {
  try {
    const { email, password, displayName } = data;
    
    // Validate input
    if (!email || !password || !displayName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields'
      );
    }
    
    // Create the user with Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: false // Still mark as not verified until they click the link
    });
    
    // Create user document in Firestore right away
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: displayName,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
      isEmailVerified: false,
      status: 'not-active'
    });
    
    // Generate a verification link
    const actionCodeSettings = {
      url: 'https://test.r8estate.com',
      handleCodeInApp: true,
    };
    
    const verificationLink = await admin.auth().generateEmailVerificationLink(
      email,
      actionCodeSettings
    );
    
    // Replace the base URL to add /verification path
    const modifiedVerificationLink = verificationLink.replace(
      'https://test.r8estate.com',
      'https://test.r8estate.com/verification'
    );
    
    // Get current year for copyright
    const currentYear = new Date().getFullYear();
    
    // Send verification email
    const emailResponse = await resend.emails.send({
      from: 'R8 Estate <verification@r8estate.com>',
      to: email,
      subject: 'Verify Your Email Address for R8 Estate',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://i.ibb.co/hx0kCnf4/R8ESTATE.png" alt="R8 Estate Logo" style="width: 100px; height: auto; border-radius: 10%;">
            <h1 style="color: #194866; margin-top: 20px;">Verify Your Email Address</h1>
          </div>
          <p>Thank you for registering with R8 Estate. To verify your email address, please click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${modifiedVerificationLink}" style="background-color: #194866; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;"><a href="${modifiedVerificationLink}">${modifiedVerificationLink}</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't create an account with R8 Estate, you can ignore this email.</p>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
            <p>&copy; ${currentYear} R8 Estate. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    if (!emailResponse.id) {
      throw new Error('Failed to send verification email');
    }
    
    return {
      success: true,
      userId: userRecord.uid,
      email: userRecord.email,
      message: 'User created successfully. Verification email sent.'
    };
    
  } catch (error) {
    console.error('Error creating verified user:', error);
    
    // Check for existing email error
    // Check for Auth error which could be 'email-already-exists' in Admin SDK
    // Check for existing email error - with proper TypeScript typing
    if (error && typeof error === 'object') {
      // Check if it has a code property that matches our expected values
      if (
        ('code' in error && 
          (error.code === 'auth/email-already-in-use' || 
           error.code === 'auth/email-already-exists')) ||
        // Check for errorInfo property which might contain the code
        ('errorInfo' in error && 
         typeof error.errorInfo === 'object' && 
         error.errorInfo && 
         'code' in error.errorInfo && 
         error.errorInfo.code === 'auth/email-already-exists')
      ) {
        throw new functions.https.HttpsError(
          'already-exists',
          'This email address is already in use by another account'
        );
      }
    } 

    if (error instanceof functions.https.HttpsError) {
  throw error;
}

// Generic fallback error
const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
throw new functions.https.HttpsError('internal', errorMessage);

  }
});