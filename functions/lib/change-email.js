"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeEmail = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const resend_1 = require("resend");
const resend = new resend_1.Resend('re_ZfaXVLi3_94WMKpGCx5XhSkKcQNFsX9nw');
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
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Generate verification link for the new email
        const actionCodeSettings = {
            url: 'https://test.r8estate.com/verification',
            handleCodeInApp: true,
        };
        const verificationLink = await admin.auth().generateEmailVerificationLink(newEmail, actionCodeSettings);
        // Get current year for copyright
        const currentYear = new Date().getFullYear();
        // Send verification email to the new address
        const emailResponse = await resend.emails.send({
            from: 'R8 Estate <verification@r8estate.com>',
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
            <a href="${verificationLink}" style="background-color: #194866; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;"><a href="${verificationLink}">${verificationLink}</a></p>
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
        }
        return { success: true };
    }
    catch (error) {
        console.error('Error changing email:', error);
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Failed to change email');
    }
});
//# sourceMappingURL=change-email.js.map