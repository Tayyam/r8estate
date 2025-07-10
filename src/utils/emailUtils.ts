import { OTP_TEMPLATE_HTML } from './emailTemplates';
/**
 * Sends an email using the Firebase Cloud Function
 * @param to Recipient email address
 * @param subject Email subject
 * @param html HTML content of the email
 * @returns Response from the email API
 */
export const sendEmailWithCloudFunction = async (
 * @param html HTML content of the email
  otp: string,
  companyName: string
    // Call the Firebase Cloud Function
    // Send the email using the cloud function
    await sendEmailWithCloudFunction(
    console.error('Error sending email with Cloud Function:', error);
      otp,
      companyName

/**
    console.error('Error sending OTP email with Cloud Function:', error);
    throw error;
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
import { httpsCallable } from 'firebase/functions';
  
import { functions } from '../config/firebase';
};