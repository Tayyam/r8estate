import { OTP_TEMPLATE_HTML } from './emailTemplates';

/**
 * Sends an email using the Resend API
 * @param to Recipient email
 * @param subject Email subject
 * @param html HTML content of the email
 * @returns Promise resolving to success boolean
 */
export const sendEmailWithResend = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer re_YK6KENqh_55k2grJZeTG9G6HHG5THszvX`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'R8 Estate <verification@r8estate.com>',
        to,
        subject,
        html
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Resend API error:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending email with Resend:", error);
    return false;
  }
};

/**
 * Sends OTP verification email
 * @param email Recipient email address
 * @param otp 6-digit OTP code
 * @param companyName Name of the company being claimed
 * @returns Promise resolving to success boolean
 */
export const sendOTPVerificationEmail = async (email: string, otp: string, companyName: string): Promise<boolean> => {
  const subject = `Your R8 Estate Verification Code: ${otp}`;
  const html = OTP_TEMPLATE_HTML
    .replace(/{{OTP}}/g, otp)
    .replace(/{{COMPANY_NAME}}/g, companyName)
    .replace(/{{YEAR}}/g, new Date().getFullYear().toString());
  
  return sendEmailWithResend(email, subject, html);
};