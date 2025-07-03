import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft, Globe, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import ForgotPasswordModal from './ForgotPasswordModal';

interface LoginProps {
  onNavigate: (page: string) => void;
}

const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login, resetPassword, loginWithGoogle } = useAuth();
  const { translations, language, setLanguage } = useLanguage();
  const { showSuccessToast, showErrorToast, showInfoToast, showSuccessModal } = useNotification();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      
      // Show success toast and navigate
      showSuccessToast(
        translations?.loginSuccess || 'Login Successful!',
        translations?.welcomeBack || 'Welcome back to R8 Estate'
      );
      
      setTimeout(() => {
        onNavigate('home');
      }, 1000);
      
    } catch (error: any) {
      // Show error toast
      showErrorToast(
        translations?.loginError || 'Login Failed',
        error.message || translations?.loginErrorDesc || 'Please check your credentials and try again'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
  };

  const handleResetPassword = async (email: string) => {
    await resetPassword(email);
    
    // Show success modal
    showSuccessModal(
      translations?.resetEmailSent || 'Password Reset Email Sent!',
      translations?.resetEmailDesc || 'We have sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.'
    );
    
    setShowForgotPassword(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLanguageToggle = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
    
    showInfoToast(
      'Language Changed',
      `Switched to ${newLang === 'ar' ? 'Arabic' : 'English'}`,
      2000
    );
  };

  const handleBackToHome = () => {
    onNavigate('home');
  };
  
  // Handle Google login
  const handleGoogleLogin = async () => {
    try {
      setSocialLoading('google');
      
      await loginWithGoogle();
      
      // Show success toast and navigate
      showSuccessToast(
        translations?.loginSuccess || 'Login Successful!',
        translations?.welcomeBack || 'Welcome back to R8 Estate'
      );
      
      setTimeout(() => {
        onNavigate('home');
      }, 1000);
      
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User closed popup - don't show error
        return;
      }
      
      showErrorToast(
        translations?.loginError || 'Login Failed',
        error.message || `Failed to login with Google`
      );
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
            {translations?.login || 'Sign In'}
          </h2>
          <p className="text-gray-600">
            {translations?.loginSubtitle || 'Welcome back'}
          </p>
        </div>

        {/* Social Login Buttons */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 animate-slideInUp">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading || resetLoading || socialLoading !== null}
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
                <span>{translations?.signInWithGoogle || 'Sign in with Google'}</span>
              </>
            )}
          </button>
          
          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm">{translations?.orContinueWith || 'or continue with'}</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8 animate-slideInUp" style={{ animationDelay: '0.2s' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="animate-slideInLeft" style={{ animationDelay: '0.3s' }}>
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
            <div className="animate-slideInRight" style={{ animationDelay: '0.4s' }}>
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

            {/* Forgot Password */}
            <div className="flex justify-end animate-slideInUp" style={{ animationDelay: '0.5s' }}>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetLoading}
                className="text-sm font-medium transition-all duration-200 flex items-center space-x-1 rtl:space-x-reverse disabled:opacity-50 hover:scale-105"
                style={{ color: '#194866' }}
                onMouseEnter={(e) => {
                  if (!resetLoading) {
                    e.target.style.color = '#EE183F';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!resetLoading) {
                    e.target.style.color = '#194866';
                  }
                }}
              >
                {resetLoading && (
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1"></div>
                )}
                <span>{translations?.forgotPassword || 'Forgot Password?'}</span>
              </button>
            </div>

            {/* Submit Button */}
            <div className="animate-slideInUp" style={{ animationDelay: '0.6s' }}>
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
                    <span>{translations?.login || 'Sign In'}</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center animate-slideInUp" style={{ animationDelay: '0.7s' }}>
            <p className="text-gray-600">
              {translations?.noAccount || 'Don\'t have an account?'}{' '}
              <button
                onClick={() => onNavigate('register')}
                className="font-semibold transition-all duration-200 hover:scale-105"
                style={{ color: '#194866' }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#EE183F';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#194866';
                }}
              >
                {translations?.createAccount || 'Create Account'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onSubmit={handleResetPassword}
      />

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

export default Login;