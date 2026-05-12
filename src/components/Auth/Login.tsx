import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight, ArrowLeft, Globe, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import ForgotPasswordModal from './ForgotPasswordModal';

interface LoginProps {
  onNavigate: (page: string) => void;
}

const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const { login, resetPassword } = useAuth();
  const { translations, language, setLanguage } = useLanguage();
  const { showSuccessModal } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get return URL from query params
  const searchParams = new URLSearchParams(location.search);
  const returnTo = searchParams.get('returnTo') || '/';
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      await login(formData.email, formData.password);
      
      // Navigate to return URL if provided, otherwise to home
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
      let errorMessage = translations?.loginErrorDesc || 'Please check your credentials and try again';
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = translations?.loginErrorDesc || 'Email or password is incorrect';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = translations?.tooManyAttempts || 'Too many failed login attempts, please try again later';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = translations?.accountDisabled || 'This account has been disabled';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = translations?.networkError || 'Network error, please check your connection';
      }
      
      setLoginError(errorMessage);
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
  };

  const handleBackToHome = () => {
    if (onNavigate) {
      onNavigate('home');
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    if (returnTo && returnTo !== '/login' && returnTo !== '/register') {
      // Don't show any toast, just render the page normally
    }
  }, [returnTo]);

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
          
          {/* Return to Message */}
          {returnTo && returnTo !== '/' && returnTo !== '/login' && returnTo !== '/register' && (
            <p className="mt-2 text-sm text-blue-600 bg-blue-50 rounded-full px-4 py-2 inline-block">
              {translations?.youWillBeRedirected || "You'll be redirected to your previous page after login"}
            </p>
          )}
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 animate-slideInUp">
          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 rtl:space-x-reverse">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{loginError}</p>
            </div>
          )}
          
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
                  placeholder={translations?.emailPlaceholder || 'Enter your email'}
                  autoFocus
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
                disabled={loading}
                className="w-full text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                style={{ backgroundColor: '#194866' }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.backgroundColor = '#0f3147';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
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
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('register');
                  } else {
                    navigate('/register' + (returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''));
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