import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendEmail } from './emailService';

// Email verification constants
const VERIFICATION_URL = 'https://test.r8estate.com/verification';

// Initialize Firebase Admin
const app = admin.initializeApp();

export const createUser = functions.https.onCall(async (data, context) => {
  try {
    // Check if the caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to call this function');
    }

    // Check if the caller is an admin
    const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const callerData = callerDoc.data();
    
    if (!callerData || callerData.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can create users');
    }

    const { email, password, displayName, role } = data;

    // Validate input
    if (!email || !password || !displayName || !role) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
    }

    if (!['admin', 'company', 'user'].includes(role)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
    }

    // Create user with Firebase Admin SDK (this won't sign them in)
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: true
    });

    // Create user document in Firestore
    const userData = {
      email: userRecord.email,
      displayName: displayName,
      role: role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isEmailVerified: true
    };

    await admin.firestore().collection('users').doc(userRecord.uid).set(userData);

    return {
      success: true,
      message: `${role === 'admin' ? 'Admin' : 'Company'} user created successfully`,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: displayName,
        role: role
      }
    };

  } catch (error) {
    console.error('Error creating user:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'An error occurred while creating the user');
  }
});

export const deleteUser = functions.https.onCall(async (data, context) => {
  try {
    // Check if the caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to call this function');
    }

    // Check if the caller is an admin
    const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const callerData = callerDoc.data();
    
    if (!callerData || callerData.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can delete users');
    }

    const { uid } = data;

    // Validate input
    if (!uid) {
      throw new functions.https.HttpsError('invalid-argument', 'User ID is required');
    }

    // Prevent admin from deleting themselves
    if (uid === context.auth.uid) {
      throw new functions.https.HttpsError('invalid-argument', 'Cannot delete your own account');
    }

    // Check if user exists in Firestore
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    // Delete user from Firebase Auth
    await admin.auth().deleteUser(uid);

    // Delete user document from Firestore
    await admin.firestore().collection('users').doc(uid).delete();

    return {
      success: true,
      message: 'User deleted successfully'
    };

  } catch (error) {
    console.error('Error deleting user:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'An error occurred while deleting the user');
  }
});

export const changeUserPassword = functions.https.onCall(async (data, context) => {
  try {
    // Check if the caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to call this function');
    }

    // Check if the caller is an admin
    const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const callerData = callerDoc.data();
    
    if (!callerData || callerData.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can change user passwords');
    }

    const { uid, newPassword } = data;

    // Validate input
    if (!uid || !newPassword) {
      throw new functions.https.HttpsError('invalid-argument', 'User ID and new password are required');
    }

    if (newPassword.length < 6) {
      throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters');
    }

    // Check if user exists
    const userRecord = await admin.auth().getUser(uid);
    if (!userRecord) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    // Update user password
    await admin.auth().updateUser(uid, {
      password: newPassword
    });

    // Update user document in Firestore
    await admin.firestore().collection('users').doc(uid).update({
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      message: 'Password changed successfully'
    };

  } catch (error) {
    console.error('Error changing password:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'An error occurred while changing the password');
  }
});

// Send verification email using Resend
export const sendVerificationEmail = functions.https.onCall(async (data, context) => {
  try {
    // Check if the caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to call this function');
    }
    
    const uid = context.auth.uid;
    const { email } = data;
    
    if (!email) {
      throw new functions.https.HttpsError('invalid-argument', 'Email is required');
    }
    
    // Generate a verification code (OOB = Out of Band)
    const oobCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store the verification code in Firestore with expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiration
    
    await admin.firestore().collection('verifications').doc(oobCode).set({
      uid,
      email,
      type: 'emailVerification',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      used: false
    });
    
    // Build verification URL
    const verificationUrl = `${VERIFICATION_URL}?mode=verifyEmail&oobCode=${oobCode}`;
    
    // Send email using the existing sendEmail function
    const sendEmailFunction = functions.httpsCallable(functions.config().projectId, 'sendEmail');
    await sendEmailFunction({
      to: email,
      subject: 'Verify Your R8 Estate Email',
      templateType: 'emailVerification',
      templateData: {
        verificationUrl,
        email
      }
    });
    
    return { success: true, message: 'Verification email sent successfully' };
  } catch (error) {
    console.error('Error sending verification email:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'An error occurred while sending the verification email');
  }
});

// Change user email without requiring password
export const changeUserEmail = functions.https.onCall(async (data, context) => {
  try {
    // Check if the caller is authenticated and is an admin
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated to call this function');
    }
    
    // Only allow admins or the user themselves to change their email
    const callerUid = context.auth.uid;
    const { uid, newEmail } = data;
    
    if (!uid || !newEmail) {
      throw new functions.https.HttpsError('invalid-argument', 'User ID and new email are required');
    }
    
    // Verify email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid email format');
    }
    
    // Check if caller is admin or changing their own email
    if (callerUid !== uid) {
      // If not self, check if admin
      const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
      const callerData = callerDoc.data();
      
      if (!callerData || callerData.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can change other users\' emails');
      }
    }
    
    // Check if new email is already in use
    try {
      const userRecord = await admin.auth().getUserByEmail(newEmail);
      if (userRecord && userRecord.uid !== uid) {
        throw new functions.https.HttpsError('already-exists', 'Email is already in use by another account');
      }
    } catch (error: any) {
      // Error code auth/user-not-found means email is available
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }
    
    // Update email in Firebase Auth
    await admin.auth().updateUser(uid, {
      email: newEmail,
      emailVerified: false // Reset verification status
    });
    
    // Update email in Firestore document
    await admin.firestore().collection('users').doc(uid).update({
      email: newEmail,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // If this is a company user, update the company email too
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const userData = userDoc.data();
    
    if (userData && userData.role === 'company' && userData.companyId) {
      await admin.firestore().collection('companies').doc(userData.companyId).update({
        email: newEmail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    return {
      success: true,
      message: 'Email changed successfully'
    };
  } catch (error) {
    console.error('Error changing email:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'An error occurred while changing the email');
  }
});

// Verify email with OOB code
export const verifyEmail = functions.https.onCall(async (data, context) => {
  try {
    const { oobCode } = data;
    
    if (!oobCode) {
      throw new functions.https.HttpsError('invalid-argument', 'Verification code is required');
    }
    
    // Get verification document
    const verificationDoc = await admin.firestore().collection('verifications').doc(oobCode).get();
    
    if (!verificationDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Invalid verification code');
    }
    
    const verification = verificationDoc.data();
    
    // Check if verification is expired
    const now = new Date();
    const expiresAt = verification?.expiresAt?.toDate();
    
    if (!expiresAt || now > expiresAt) {
      throw new functions.https.HttpsError('deadline-exceeded', 'Verification code has expired');
    }
    
    // Check if verification has been used
    if (verification?.used) {
      throw new functions.https.HttpsError('already-exists', 'Verification code has already been used');
    }
    
    // Mark the verification as used
    await admin.firestore().collection('verifications').doc(oobCode).update({
      used: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update the user's email verification status in Auth
    await admin.auth().updateUser(verification?.uid, {
      emailVerified: true
    });
    
    // Update the user's email verification status in Firestore
    await admin.firestore().collection('users').doc(verification?.uid).update({
      isEmailVerified: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      message: 'Email verified successfully'
    };
  } catch (error) {
    console.error('Error verifying email:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'An error occurred while verifying the email');
  }
});

// Export the email service function
export { sendEmail };