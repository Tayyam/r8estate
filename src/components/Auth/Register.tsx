import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, ArrowLeft, Globe, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';

interface RegisterProps {
  onNavigate: (page: string) => void;
}

const Register: React.FC<RegisterProps> = ({ onNavigate }) => {
  const { register, loginWithGoogle } = useAuth();
  const { translations, language, setLanguage } = useLanguage();
  const { showSuccessToast } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get return URL from query params
  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('returnTo') || '/';
  
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      
      // Show success toast and immediately navigate
      showSuccessToast(
        translations?.accountCreated || 'Account Created Successfully!',
        translations?.welcomeToR8Estate || 'Welcome to R8 Estate! Your account has been created and you are now logged in.',
      );
      
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
      // Create user-friendly error messages
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
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLanguageToggle = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
  };

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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header with Language Toggle and Back Button */}
        <div className="flex items-center justify-between mb-8 animate-slideInDown">
          {/* Back to Home Button */}
          <button
            onClick={handleBackToHome}
            className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 text-gray-600 hover:text-gray-800 transition-all duration-200 rounded-lg hover:bg-gray-100 transform hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">
              {translations?.home || 'Home'}
            </span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={handleLanguageToggle}
            className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 rounded-lg border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 transform hover:scale-105"
          >
            <Globe className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              {language === 'ar' ? 'EN' : 'العربية'}
            </span>
          </button>
        </div>

        {/* Logo and Title */}
        <div className="text-center mb-8 animate-slideInUp">
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
            {translations?.createAccount || 'Create Account'}
          </h2>
          <p className="text-gray-600">
            {translations?.registerSubtitle || 'Join the R8 Estate community'}
          </p>
          
          {/* Return to Message */}
          {returnTo && returnTo !== '/' && returnTo !== '/login' && returnTo !== '/register' && (
            <p className="mt-2 text-sm text-blue-600 bg-blue-50 rounded-full px-4 py-2 inline-block">
              {translations?.youWillBeRedirected || "You'll be redirected to your previous page after registration"}
            </p>
          )}
        </div>

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

        {/* Register Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8 animate-slideInUp" style={{ animationDelay: '0.2s' }}>
          {registerError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 rtl:space-x-reverse">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{registerError}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name Field */}
            <div className="animate-slideInLeft" style={{ animationDelay: '0.3s' }}>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.fullName || 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 transform focus:scale-105"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#194866';
                    e.target.style.boxShadow = `0 0 0 3px rgba(25, 72, 102, 0.1)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder={translations?.fullNamePlaceholder || 'Enter your full name'}
                  autoFocus
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="animate-slideInRight" style={{ animationDelay: '0.4s' }}>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.email || 'Email'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 transform focus:scale-105"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#194866';
                    e.target.style.boxShadow = `0 0 0 3px rgba(25, 72, 102, 0.1)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder={translations?.emailPlaceholder || 'Enter your email'}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="animate-slideInLeft" style={{ animationDelay: '0.5s' }}>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.password || 'Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 rtl:pr-10 pr-12 rtl:pl-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 transform focus:scale-105"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#194866';
                    e.target.style.boxShadow = `0 0 0 3px rgba(25, 72, 102, 0.1)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder={translations?.passwordPlaceholder || 'Enter your password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110"
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
            <div className="animate-slideInRight" style={{ animationDelay: '0.6s' }}>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.confirmPassword || 'Confirm Password'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-10 rtl:pr-10 pr-12 rtl:pl-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 transform focus:scale-105"
                  style={{ 
                    focusBorderColor: '#194866',
                    focusRingColor: '#194866'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#194866';
                    e.target.style.boxShadow = `0 0 0 3px rgba(25, 72, 102, 0.1)`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder={translations?.confirmPasswordPlaceholder || 'Re-enter your password'}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 rtl:left-3 rtl:right-auto top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-all duration-200 hover:scale-110"
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
            <div className="animate-slideInUp" style={{ animationDelay: '0.65s' }}>
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
            <div className="animate-slideInUp" style={{ animationDelay: '0.7s' }}>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    required
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="text-gray-600">
                    {translations?.agreeToTerms || 'I agree to the'}{' '}
                    <Link
                      to="/terms"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {translations?.termsOfService || 'Terms of Service'}
                    </Link>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="animate-slideInUp" style={{ animationDelay: '0.75s' }}>
              <button
                type="submit"
                disabled={loading || socialLoading !== null}
                className="w-full text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
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
          </form>

          {/* Login Link */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center animate-slideInUp" style={{ animationDelay: '0.8s' }}>
            <p className="text-gray-600">
              {translations?.haveAccount || 'Already have an account?'}{' '}
              <button
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('login');
                  } else {
                    navigate('/login' + (returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''));
                  }
                }}
                className="font-semibold transition-all duration-200 hover:scale-105"
                style={{ color: '#194866' }}
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
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

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

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slideInDown {
          animation: slideInDown 0.6s ease-out;
        }

        .animate-slideInUp {
          animation: slideInUp 0.6s ease-out;
          animation-fill-mode: both;
        }

        .animate-slideInLeft {
          animation: slideInLeft 0.6s ease-out;
          animation-fill-mode: both;
        }

        .animate-slideInRight {
          animation: slideInRight 0.6s ease-out;
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
};

export default Register;