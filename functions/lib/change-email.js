"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeEmail = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const resend_1 = require("resend");
// Initialize Resend with the API key
const RESEND_API_KEY = 're_ZfaXVLi3_94WMKpGCx5XhSkKcQNFsX9nw';
const resend = new resend_1.Resend(RESEND_API_KEY);
exports.changeEmail = functions.https.onCall(async (data, context) => {
    try {
        // Check if user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { newEmail } = data;
        if (!newEmail) {
            throw new functions.https.HttpsError('invalid-argument', 'New email is required');
        }
        // Check if the new email is already in use
        try {
            // Get user by email to check if the email already exists
            const userRecord = await admin.auth().getUserByEmail(newEmail);
            // If the code executes to this point, it means the email exists
            // But check if it's the current user's email
            if (userRecord.uid !== userId) {
                throw new functions.https.HttpsError('already-exists', 'البريد الإلكتروني مستخدم بالفعل من قبل مستخدم آخر');
            }
        }
        catch (error) {
            // If error code is auth/user-not-found, it means the email is not in use
            if (error.code !== 'auth/user-not-found') {
                // If it's a different error, rethrow it
                if (error instanceof functions.https.HttpsError) {
                    throw error;
                }
                throw new functions.https.HttpsError('internal', 'حدث خطأ أثناء التحقق من البريد الإلكتروني');
            }
            // If email is not found, that's good - continue with email change
        }
        const userId = context.auth.uid;
        // Update user email in Firebase Auth
        await admin.auth().updateUser(userId, {
            email: newEmail,
            emailVerified: false, // Reset email verification status
        });
        // Update user document in Firestore
        await admin.firestore().collection('users').doc(userId).update({
            email: newEmail,
            isEmailVerified: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            emailChangeTimestamp: admin.firestore.FieldValue.serverTimestamp() // Add timestamp for email change
        });
        // Generate verification link for the new email
        const actionCodeSettings = {
            url: 'https://test.r8estate.com',
            handleCodeInApp: true,
        };
        const verificationLink = await admin.auth().generateEmailVerificationLink(newEmail, actionCodeSettings);
        // Replace the base URL to add /verification path
        const modifiedVerificationLink = verificationLink.replace('https://test.r8estate.com', 'https://test.r8estate.com/verification');
        // Get current year for copyright
        const currentYear = new Date().getFullYear();
        // Send verification email to the new address
        const emailResponse = await resend.emails.send({
            from: 'R8 Estate <support@r8estate.com>', // Change to a verified sender domain
            to: newEmail,
            subject: 'Verify Your New Email Address',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://i.ibb.co/hx0kCnf4/R8ESTATE.png" alt="R8 Estate Logo" style="width: 100px; height: auto; border-radius: 10%;">
            <h1 style="color: #194866; margin-top: 20px;">Verify Your New Email Address</h1>
          </div>
          <p>You've successfully changed your email address. Please click the button below to verify your new email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${modifiedVerificationLink}" style="background-color: #194866; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;"><a href="${modifiedVerificationLink}">${modifiedVerificationLink}</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this change, please contact us immediately.</p>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
            <p>&copy; ${currentYear} R8 Estate. All rights reserved.</p>
          </div>
        </div>
      `,
        });
        if (!emailResponse.id) {
            throw new Error('Failed to send email: No response ID received');
            // Log more details about the response
            console.error('Email API response:', emailResponse);
        }
        console.log('Email verification sent successfully:', emailResponse.id);
        return { success: true };
    }
    catch (error) {
        console.error('Error changing email:', error);
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Failed to change email');
    }
});
//# sourceMappingURL=change-email.js.map