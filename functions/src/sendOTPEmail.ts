import * as functions from 'firebase-functions';
import { Resend } from 'resend';

const resend = new Resend('re_YK6KENqh_55k2grJZeTG9G6HHG5THszvX');

export const sendOTPEmail = functions.https.onCall(async (data, context) => {
  try {
    // Validate the caller is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    const { email, otp, companyName } = data;
    
    // Validate input
    if (!email || !otp || !companyName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: email, otp, companyName'
      );
    }
    
    // HTML template for OTP email
    const htmlContent = getOTPEmailTemplate(otp, companyName);
    
    // Send email using Resend
    const response = await resend.emails.send({
      from: 'R8 Estate <verification@ithraaoperation.com>',
      to: email,
      subject: `Your R8 Estate Verification Code: ${otp}`,
      html: htmlContent
    });

    if (!response.id) {
      throw new Error('Failed to send email: No response ID received');
    }
    
    return { success: true, messageId: response.id };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send verification email'
    );
  }
});

// Helper function to generate HTML template
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