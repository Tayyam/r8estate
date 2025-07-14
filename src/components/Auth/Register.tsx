import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, ArrowLeft, Globe, AlertCircle, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface RegisterProps {
  onNavigate: (page: string) => void;
}

const Register: React.FC<RegisterProps> = ({ onNavigate }) => {
  const { register, loginWithGoogle, sendVerificationEmail } = useAuth();
  const { translations, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get return URL from query params
  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('returnTo') || '/';
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1); // 1 = Create Account, 2 = Verify Email
  
  // Registration form state
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Handle input change
  const handleInputChange = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  // Handle account creation
  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    setRegisterError('');
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setRegisterError(translations?.passwordMismatchDesc || 'Passwords do not match. Please try again.');
      return;
    }

    if (formData.password.length < 6) {
      setRegisterError(translations?.passwordTooShortDesc || 'Password must be at least 6 characters long.');
      return;
    }
    
    if (!agreeToTerms) {
      setRegisterError(translations?.termsAgreementRequired || 'You must agree to the Terms of Use to create an account.');
      return;
    }

    setLoading(true);

    try {
      await register(formData.email, formData.password, formData.displayName, 'user');
      await register(formData.email, formData.password, formData.displayName, 'user'); 
      setCurrentStep(2);
      setCountdown(60);
      setLoading(false); // Important: set loading to false here
    } catch (error: any) {
      // Create user-friendly error messages
      console.log('⚠️ Register error:', error);
      let errorMessage = translations?.registrationErrorDesc || 'Failed to create account. Please try again.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = translations?.emailAlreadyInUse || 'This email address is already in use by another account';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = translations?.invalidEmailFormat || 'Please enter a valid email address';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = translations?.passwordTooWeak || 'The password is too weak. Please choose a stronger password';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = translations?.networkError || 'Network error, please check your connection';
      }
      
      setRegisterError(errorMessage);
      setLoading(false);
    }
  };

  // Handle email verification resend
  const handleResendVerification = async () => {
    try {
      console.log('⚠️ Resending verification email');
      setResendLoading(true);
      
      await sendVerificationEmail(formData.email);
      
      setResendSuccess(true);
      setCountdown(60); // Reset countdown timer
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setResendSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error resending verification email:', error);
      setRegisterError(translations?.failedToSendVerification || 'Failed to send verification email. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };
  
  // Handle countdown timer
  React.useEffect(() => {
    let timer: number | null = null;
    if (countdown > 0) {
      timer = window.setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  // Handle language toggle
  const handleLanguageToggle = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
  };

  // Handle back navigation
  const handleBackToHome = () => {
    if (onNavigate) {
      onNavigate('home');
    } else {
      navigate('/');
    }
  };
  
  // Handle Google signup
  const handleGoogleSignup = async () => {
    try {
      setSocialLoading('google');
      setRegisterError('');
      
      await loginWithGoogle();
      
      // Navigate to return URL if provided
      setTimeout(() => {
        if (returnTo && returnTo !== '/login' && returnTo !== '/register') {
          navigate(returnTo);
        } else if (onNavigate) {
          onNavigate('home');
        } else {
          navigate('/');
        }
      }, 500);
      
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User closed popup - don't show error
        return;
      }
      
      setRegisterError(translations?.socialLoginErrorDesc || 'Failed to sign up with Google');
    } finally {
      setSocialLoading(null);
    }
  };
  
  // Handle sign-in navigation
  const handleGoToLogin = () => {
    if (onNavigate) {
      onNavigate('login');
    } else {
      navigate('/login' + (returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''));
    }
  };
  
  // Render Create Account step
    return (
      <>
        {/* Social Signup Buttons */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 animate-slideInUp" style={{ animationDelay: '0.2s' }}>
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading || socialLoading !== null}
            className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
          >
            {socialLoading === 'google' ? (
              <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#34A853"
                    d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09c1.97 3.92 6.02 6.62 10.71 6.62z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29v-3.09h-3.98c-.8 1.61-1.26 3.43-1.26 5.38s.46 3.77 1.26 5.38l3.98-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12.255 5.04c1.77 0 3.35.61 4.6 1.8l3.42-3.42c-2.07-1.94-4.78-3.13-8.02-3.13-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
                <span>{translations?.signUpWithGoogle || 'Sign up with Google'}</span>
              </>
            )}
          </button>
          
          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm">{translations?.orContinueWith || 'or continue with'}</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleCreateAccount} className="bg-white rounded-2xl shadow-lg p-8 animate-slideInUp" style={{ animationDelay: '0.2s' }}>
          {registerError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 rtl:space-x-reverse">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{registerError}</p>
            </div>
          )}
          
          <div className="space-y-6">
            {/* Display Name Field */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.fullName || 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                  placeholder={translations?.fullNamePlaceholder || 'Enter your full name'}
                  autoFocus
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.email || 'Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                  placeholder={translations?.emailPlaceholder || 'Enter your email'}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.password || 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full pl-10 rtl:pr-10 pr-12 rtl:pl-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                  placeholder={translations?.passwordPlaceholder || 'Enter your password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.confirmPassword || 'Confirm Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="w-full pl-10 rtl:pr-10 pr-12 rtl:pl-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                  placeholder={translations?.confirmPasswordPlaceholder || 'Re-enter your password'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Validation Indicator */}
            <div>
              {formData.password && (
                <div className={`text-sm flex items-center space-x-2 rtl:space-x-reverse ${
                  formData.password.length >= 6 ? 'text-green-600' : 'text-red-500'
                }`}>
                  {formData.password.length >= 6 ? (
                    <>
                      <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      </div>
                      <span>{translations?.passwordStrengthGood || 'Password length is good'}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>{translations?.passwordTooShort || 'Password must be at least 6 characters'}</span>
                    </>
                  )}
                </div>
              )}

              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <div className="text-sm text-red-500 flex items-center space-x-2 rtl:space-x-reverse mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{translations?.passwordMismatch || 'Passwords do not match'}</span>
                </div>
              )}
            </div>

            {/* Terms and Conditions Checkbox */}
            <div>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="text-gray-600">
                    {translations?.agreeToTerms || 'I agree to the'}{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/terms')}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {translations?.termsOfService || 'Terms of Service'}
                    </button>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading || socialLoading !== null}
                className="w-full text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-lg hover:shadow-xl disabled:opacity-50"
                style={{ backgroundColor: '#194866' }}
                onMouseEnter={(e) => {
                  if (!loading && socialLoading === null) {
                    e.target.style.backgroundColor = '#0f3147';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && socialLoading === null) {
                    e.target.style.backgroundColor = '#194866';
                  }
                }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>{translations?.createAccount || 'Create Account'}</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Login Link */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600">
              {translations?.haveAccount || 'Already have an account?'}{' '}
              <button
                type="button"
                onClick={handleGoToLogin}
                className="font-semibold transition-all duration-200"
                style={{ color: '#194866', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#EE183F';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#194866';
                }}
              >
                {translations?.login || 'Sign In'}
              </button>
            </p>
          </div>
        </form>
      </>
    );
  };
  
  // Render Email Verification step
  const renderVerificationStep = () => {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 animate-slideInUp">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="h-10 w-10 text-blue-600" />
          </div>
          
          <h3 className="text-2xl font-bold mb-4 text-gray-900">
            {translations?.verifyYourEmail || 'Verify Your Email'}
          </h3>
          
          <p className="text-gray-600 mb-8">
            {translations?.verificationEmailSentDesc || `A verification email has been sent to ${formData.email}. Please check your inbox and verify your email address to activate your account.`}
          </p>

          {resendSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
              <p className="text-green-700 text-sm">
                {translations?.verificationEmailResent || 'Verification email resent! Please check your inbox.'}
              </p>
            </div>
          )}

          <div className="flex flex-col space-y-4">
            <button
              onClick={handleResendVerification}
              disabled={resendLoading || countdown > 0}
              type="button"
              className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors duration-200" 
            >
              {resendLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5" />
              )}
              <span>
                {resendLoading 
                  ? (translations?.sending || 'Sending...') 
                  : countdown > 0
                    ? `${translations?.resendIn || 'Resend in'} ${countdown}s`
                    : (translations?.resendVerificationEmail || 'Resend Verification Email')
                }
              </span>
            </button>

            <button
              type="button"
              onClick={handleGoToLogin}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors duration-200"
            >
              {translations?.goToLogin || 'Go to Login'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header with Language Toggle and Back Button */}
        <div className="flex items-center justify-between mb-8">
          {/* Back to Home Button */}
          <button
            type="button"
            onClick={handleBackToHome}
            className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 text-gray-600 hover:text-gray-800 transition-all duration-200 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">
              {translations?.home || 'Home'}
            </span>
          </button>

          {/* Language Toggle */}
          <button
            type="button"
            onClick={handleLanguageToggle}
            className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
          >
            <Globe className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              {language === 'ar' ? 'EN' : 'العربية'}
            </span>
          </button>
        </div>

        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="https://i.ibb.co/hx0kCnf4/R8ESTATE.png" 
              alt="R8ESTATE Logo" 
              className="w-12 h-12 object-contain rounded-full mr-3"
            />
            <div className="text-2xl font-bold">
              <span style={{ color: '#EE183F' }}>R8</span>
              <span style={{ color: '#194866' }}>ESTATE</span>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold mb-2" style={{ color: '#194866' }}>
            {currentStep === 1 
              ? (translations?.createAccount || 'Create Account') 
              : (translations?.verifyYourEmail || 'Verify Your Email')}
          </h2>
          
          <p className="text-gray-600">
            {currentStep === 1 
              ? (translations?.registerSubtitle || 'Join the R8 Estate community')
              : (translations?.verificationEmailSentDesc || 'Check your email inbox to complete registration')}
          </p>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center mt-6 mb-8">
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${
                currentStep > 1 ? 'bg-blue-600' : 'bg-gray-200'
              }`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
            </div>
          </div>
          
          {/* Return to Message */}
          {returnTo && returnTo !== '/' && returnTo !== '/login' && returnTo !== '/register' && (
            <p className="mt-2 text-sm text-blue-600 bg-blue-50 rounded-full px-4 py-2 inline-block">
              {translations?.youWillBeRedirected || "You'll be redirected after completing registration"}
            </p>
          )}
        </div>

        {/* Step Content */}
        {currentStep === 1 ? renderCreateAccountStep() : renderVerificationStep()}
      </div>
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideInUp {
          animation: slideInUp 0.6s ease-out;
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
};

export default Register;