import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, ArrowLeft, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';

interface RegisterProps {
  onNavigate: (page: string) => void;
}

const Register: React.FC<RegisterProps> = ({ onNavigate }) => {
  const { register } = useAuth();
  const { translations, language, setLanguage } = useLanguage();
  const { showSuccessModal, showErrorToast, showInfoToast } = useNotification();
  
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      showErrorToast(
        translations?.passwordMismatch || 'Password Mismatch',
        translations?.passwordMismatchDesc || 'Passwords do not match. Please try again.'
      );
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      showErrorToast(
        translations?.passwordTooShort || 'Password Too Short',
        translations?.passwordTooShortDesc || 'Password must be at least 6 characters long.'
      );
      setLoading(false);
      return;
    }

    try {
      await register(formData.email, formData.password, formData.displayName, 'user');
      
      // Show success modal and redirect
      showSuccessModal(
        translations?.accountCreated || 'Account Created Successfully!',
        translations?.verificationSent || 'A verification email has been sent to your email address. Please verify your email and then you can sign in.',
        () => {
          onNavigate('login');
        }
      );
      
    } catch (error: any) {
      showErrorToast(
        translations?.registrationError || 'Registration Failed',
        error.message || translations?.registrationErrorDesc || 'Failed to create account. Please try again.'
      );
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
    
    showInfoToast(
      'Language Changed',
      `Switched to ${newLang === 'ar' ? 'Arabic' : 'English'}`,
      2000
    );
  };

  const handleBackToHome = () => {
    onNavigate('home');
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
              src="https://i.ibb.co/YrNNbnz/R8-ESTATEORG.png" 
              alt="R8ESTATE Logo" 
              className="w-12 h-12 object-contain rounded-full mr-3 animate-pulse"
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
        </div>

        {/* Register Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8 animate-slideInUp" style={{ animationDelay: '0.2s' }}>
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

            {/* Submit Button */}
            <div className="animate-slideInUp" style={{ animationDelay: '0.7s' }}>
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
                onClick={() => onNavigate('login')}
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