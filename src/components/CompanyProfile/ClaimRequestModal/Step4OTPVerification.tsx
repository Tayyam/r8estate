import React from 'react';
import { AlertCircle, Check } from 'lucide-react';

interface Step4OTPVerificationProps {
  formData: {
    businessEmail: string;
  };
  otpCode: string;
  setOtpCode: (code: string) => void;
  loading: boolean;
  otpSending: boolean;
  handleSendOTP: () => void;
  handleVerifyOTP: () => void;
  setCurrentStep: (step: number) => void;
  translations: any;
}

const Step4OTPVerification: React.FC<Step4OTPVerificationProps> = ({
  formData,
  otpCode,
  setOtpCode,
  loading,
  otpSending,
  handleSendOTP,
  handleVerifyOTP,
  setCurrentStep,
  translations
}) => {
  return (
    <div className="p-6 space-y-6">
      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-start space-x-3 rtl:space-x-reverse">
          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <h5 className="text-sm font-medium text-yellow-800 mb-1">
              {translations?.otpVerificationRequired || 'OTP Verification Required'}
            </h5>
            <p className="text-sm text-yellow-700">
              {translations?.otpVerificationMessage || `We've sent a 6-digit verification code to `}
              <strong>{formData.businessEmail}</strong>.
              {translations?.otpVerificationInstruction || ' Please enter it below to verify your email.'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-center space-y-4">
        <div className="w-full max-w-xs">
          <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
            {translations?.enterOtpCode || 'Enter 6-digit verification code'}
          </label>
          <input
            type="text"
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest"
            placeholder="------"
          />
        </div>
        
        <p className="text-sm text-gray-600 text-center">
          {translations?.didntReceiveCode || 'Didn\'t receive a code?'}{' '}
          <button
            type="button"
            onClick={handleSendOTP}
            disabled={otpSending}
            className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            {otpSending ? (translations?.sending || 'Sending...') : (translations?.resend || 'Resend')}
          </button>
        </p>
        
        <p className="text-xs text-gray-500 text-center">
          {translations?.otpExpiresIn || 'OTP will expire in 60 minutes'}
        </p>
      </div>
      
      <div className="flex justify-end space-x-3 rtl:space-x-reverse pt-4">
        <button
          type="button"
          onClick={() => setCurrentStep(3)}
          className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          {translations?.back || 'Back'}
        </button>
        
        <button
          type="button"
          onClick={handleVerifyOTP}
          disabled={loading || otpCode.length !== 6}
          className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 rtl:space-x-reverse disabled:opacity-50"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          <span>
            {loading
              ? (translations?.verifying || 'Verifying...')
              : (translations?.verifyAndSubmit || 'Verify & Submit')
            }
          </span>
        </button>
      </div>
    </div>
  );
};

export default Step4OTPVerification;