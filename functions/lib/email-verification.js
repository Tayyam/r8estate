"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const resend_1 = require("resend");
const resend = new resend_1.Resend('re_ZfaXVLi3_94WMKpGCx5XhSkKcQNFsX9nw');
exports.sendVerificationEmail = functions.https.onCall(async (data, context) => {
    try {
        const { email } = data;
        if (!email) {
            throw new functions.https.HttpsError('invalid-argument', 'Email is required');
        }
        // Generate a verification link
        const actionCodeSettings = {
            url: 'https://test.r8estate.com',
            handleCodeInApp: true,
        };
        const verificationLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
        // Replace the base URL to add /verification path
        const modifiedVerificationLink = verificationLink.replace('https://test.r8estate.com', 'https://test.r8estate.com/verification');
        // Get current year for copyright
        const currentYear = new Date().getFullYear();
        // Send the verification email using Resend
        const emailResponse = await resend.emails.send({
            from: 'R8 Estate <verification@r8estate.com>',
            to: email,
            subject: 'Verify Your Email Address',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://i.ibb.co/hx0kCnf4/R8ESTATE.png" alt="R8 Estate Logo" style="width: 100px; height: auto; border-radius: 10%;">
            <h1 style="color: #194866; margin-top: 20px;">Verify Your R8 Estate Email Address</h1>
          </div>
          <p>Thank you for signing up with R8 Estate. To verify your email address, please click the button below:</p>
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
            throw new Error('Failed to send email: No response ID received');
        }
        return { success: true };
    }
    catch (error) {
        console.error('Error sending verification email:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send verification email');
    }
});
handleCodeInApp: true,
;
;
const verificationLink = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
// Get current year for copyright
const currentYear = new Date().getFullYear();
// Send the verification email using Resend
const emailResponse = await resend.emails.send({
    from: 'R8 Estate <verification@r8estate.com>',
    to: email,
    subject: 'Verify Your Email Address',
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://i.ibb.co/hx0kCnf4/R8ESTATE.png" alt="R8 Estate Logo" style="width: 100px; height: auto; border-radius: 10%;">
            <h1 style="color: #194866; margin-top: 20px;">Verify Your R8 Estate Email Address</h1>
          </div>
          <p>Thank you for signing up with R8 Estate. To verify your email address, please click the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #194866; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email Address</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
          <p style="word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;"><a href="${verificationLink}">${verificationLink}</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't create an account with R8 Estate, you can ignore this email.</p>
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
try { }
catch (error) {
    console.error('Error sending verification email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send verification email');
}
;
//# sourceMappingURL=email-verification.js.map