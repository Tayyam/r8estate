import * as functions from 'firebase-functions';
import { Resend } from 'resend';
import * as admin from 'firebase-admin';

const resend = new Resend('re_ZfaXVLi3_94WMKpGCx5XhSkKcQNFsX9nw');

export const sendEmail = functions.https.onCall(async (data) => {
  try {
    const { to, subject, html, templateType, templateData } = data;
    
    // Validate required fields
    if (!to) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required field: to'
      );
    }
    
    let emailHtml = html;
    
    // If template is specified, generate appropriate template
    if (templateType && !html) {
      switch (templateType) {
        case 'otp':
          if (!templateData?.otp || !templateData?.companyName) {
            throw new functions.https.HttpsError(
              'invalid-argument',
              'Missing required template data for OTP email'
            );
          }
          emailHtml = getOTPEmailTemplate(templateData.otp, templateData.companyName);
          break;
        case 'password-reset':
          if (!templateData?.email) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing email for password reset');
          }
          // Generate actual password reset link using Firebase Admin SDK
          try {
            const resetLink = await admin.auth().generatePasswordResetLink(
              templateData.email, 
              {
                url: 'https://test.r8estate.com'
              }
            );
            
            // Replace the base URL to add /reset-password path
            const modifiedResetLink = resetLink.replace(
              'https://test.r8estate.com',
              'https://test.r8estate.com/reset-password'
            );
            
            emailHtml = getPasswordResetEmailTemplate(modifiedResetLink);
          } catch (error) {
            console.error('Error generating reset link:', error);
            throw new functions.https.HttpsError('internal', 'Failed to generate password reset link');
          }
          break;
        default:
          throw new functions.https.HttpsError(
            'invalid-argument',
            'Invalid template type'
          );
      }
    }
    
    // Ensure we have HTML content
    if (!emailHtml) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'No HTML content or valid template provided'
      );
    }
    
    // Set default subject if not provided
    const emailSubject = subject || 'Message from R8 Estate';
    
    // Send email using Resend
    const response = await resend.emails.send({
      from: 'R8 Estate <support@r8estate.com>',
      to,
      subject: emailSubject,
      html: emailHtml
    });

    if (!response.id) {
      throw new Error('Failed to send email: No response ID received');
    }
    
    return { success: true, messageId: response.id };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send email'
    );
  }
});

// Helper function to generate OTP email template
function getOTPEmailTemplate(otp: string, companyName: string): string {
  const currentYear = new Date().getFullYear();
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>R8 Estate Verification</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
      }
      .header {
        background-color: #194866;
        padding: 20px;
        text-align: center;
      }
      .logo {
        color: white;
        font-size: 24px;
        font-weight: bold;
      }
      .content {
        padding: 30px 20px;
        border: 1px solid #e5e7eb;
        border-top: none;
      }
      .otp-code {
        background-color: #f3f4f6;
        padding: 15px;
        text-align: center;
        font-size: 32px;
        font-weight: bold;
        letter-spacing: 10px;
        margin: 30px 0;
        color: #194866;
      }
      .message {
        margin-bottom: 20px;
        font-size: 16px;
      }
      .footer {
        text-align: center;
        padding: 15px;
        background-color: #f3f4f6;
        font-size: 12px;
        color: #6b7280;
      }
      .highlight {
        color: #194866;
        font-weight: bold;
      }
      .warning {
        color: #7F1D1D;
        font-size: 14px;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">R8 ESTATE</div>
      </div>
      <div class="content">
        <h2>Email Verification</h2>
        <div class="message">
          You're in the process of claiming <span class="highlight">${companyName}</span> on R8 Estate. To verify your email address, please use the following verification code:
        </div>
        <div class="otp-code">${otp}</div>
        <div class="message">
          This code will expire in <strong>60 minutes</strong>. If you don't use it before then, you will need to request a new one.
        </div>
        <div class="warning">
          If you didn't request this verification, please ignore this email or contact our support team if you have concerns.
        </div>
      </div>
      <div class="footer">
        &copy; ${currentYear} R8 Estate. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
}

// Helper function to generate password reset email template
function getPasswordResetEmailTemplate(resetLink: string): string {
  const currentYear = new Date().getFullYear();
  
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>R8 Estate Password Reset</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
      }
      .header {
        background-color: #194866;
        padding: 20px;
        text-align: center;
      }
      .logo {
        color: white;
        font-size: 24px;
        font-weight: bold;
      }
      .content {
        padding: 30px 20px;
        border: 1px solid #e5e7eb;
        border-top: none;
      }
      .button {
        background-color: #194866;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
        display: inline-block;
        margin: 20px 0;
      }
      .message {
        margin-bottom: 20px;
        font-size: 16px;
      }
      .footer {
        text-align: center;
        padding: 15px;
        background-color: #f3f4f6;
        font-size: 12px;
        color: #6b7280;
      }
      .highlight {
        color: #194866;
        font-weight: bold;
      }
      .warning {
        color: #7F1D1D;
        font-size: 14px;
        margin-top: 20px;
      }
      .button-container {
        text-align: center;
        margin: 30px 0;
      }
      .help-text {
        font-size: 14px;
        color: #6b7280;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">R8 ESTATE</div>
      </div>
      <div class="content">
        <h2>Password Reset</h2>
        <div class="message">
          You recently requested to reset your password for your R8 Estate account. Click the button below to reset it.
        </div>
        <div class="button-container">
          <a href="${resetLink}" class="button">Reset Your Password</a>
        </div>
        <div class="message">
          This password reset link is only valid for the next <strong>60 minutes</strong>. If you don't use it within that time, you'll need to request a new one.
        </div>
        <div class="help-text">
          If the button doesn't work, you can also copy and paste the following link into your browser:
          <br><br>
          <a href="${resetLink}" style="word-break: break-all; color: #194866;">${resetLink}</a>
        </div>
        <div class="warning">
          If you didn't request a password reset, please ignore this email or contact our support team if you have concerns.
        </div>
      </div>
      <div class="footer">
        &copy; ${currentYear} R8 Estate. All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
}