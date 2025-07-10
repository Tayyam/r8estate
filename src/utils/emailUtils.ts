import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * Sends OTP verification email using Firebase Cloud Function
 * @param email Recipient email address
 * @param otp 6-digit OTP code
 * @param companyName Name of the company being claimed
 * @returns Promise resolving to success boolean
 */
export const sendOTPVerificationEmail = async (email: string, otp: string, companyName: string): Promise<boolean> => {
  try {
    // Call the Cloud Function
    const sendOTPEmailFunction = httpsCallable(functions, 'sendOTPEmail');
    
    const response = await sendOTPEmailFunction({
      email,
      otp,
      companyName
    });
    
    // Check if the function returned success
    const data = response.data as any;
    return data.success === true;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return false;
  }
};