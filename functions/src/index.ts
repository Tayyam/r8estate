import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendEmail } from './emailService';
import { sendVerificationEmail } from './email-verification';
import { changeEmail } from './change-email';
import { claimProcess, verifySupervisor, checkBusinessEmailVerification } from './claim-process';
import { createUnverifiedUser } from './create-unverified-user';

admin.initializeApp();
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

// Export the email service function
export { sendEmail };
// Export the email verification function
export { sendVerificationEmail };
// Export the verified user creation function
export { createVerifiedUser } from './create-verified-user';
// Export the email change function
export { changeEmail };
// Export the claim process functions
export { claimProcess, verifySupervisor, checkBusinessEmailVerification };
// Export the create unverified user function
export { createUnverifiedUser };