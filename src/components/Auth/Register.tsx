import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import GoogleOneTap from '../GoogleOneTap';

interface RegisterProps {
  onNavigate: (page: string) => void;
}

const Register: React.FC<RegisterProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register } = useAuth();
  const { translations, language } = useLanguage();
  const { showSuccessToast, showErrorToast } = useNotification();
  
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Get return URL from query params
  const returnTo = new URLSearchParams(location.search).get('returnTo');

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.displayName || !formData.email || !formData.password || !formData.confirmPassword) {
      showErrorToast(
        translations?.missingFields || 'Missing Fields',
        translations?.fillAllFields || 'Please fill in all fields'
      );
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showErrorToast(
        translations?.passwordMismatch || 'Password Mismatch',
        translations?.passwordMismatchDesc || 'Passwords do not match. Please try again.'
      );
      return;
    }

    if (formData.password.length < 6) {
      showErrorToast(
        translations?.passwordTooShort || 'Password Too Short',
        translations?.passwordTooShortDesc || 'Password must be at least 6 characters long.'
      );
      return;
    }

    if (!formData.agreeToTerms) {
      showErrorToast(
        translations?.termsRequired || 'Terms Agreement Required',
        translations?.termsAgreementRequired || 'You must agree to the terms of service to create an account'
      );
      return;
    }

    try {
      setLoading(true);
      
      await register(formData.email, formData.password, formData.displayName);
      
      // Save credentials to localStorage for auto-login after verification
      localStorage.setItem('pendingLoginEmail', formData.email);
      localStorage.setItem('pendingLoginPassword', formData.password);
      
      showSuccessToast(
        translations?.accountCreated || 'Account Created Successfully!',
        translations?.verificationSent || 'A verification email has been sent to your email address. Please verify your email and then you can log in.'
      );

      // Navigate to verification page or return URL after a short delay
      setTimeout(() => {
        if (returnTo) {
          navigate(`/verification?returnTo=${encodeURIComponent(returnTo)}`);
        } else {
          navigate('/verification');
        }
      }, 2000);

    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = translations?.registrationErrorDesc || 'Failed to create account, please try again';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = translations?.emailAlreadyInUse || 'This email address is already in use';
          break;
        case 'auth/invalid-email':
          errorMessage = translations?.invalidEmailFormat || 'Please enter a valid email address';
          break;
        case 'auth/weak-password':
          errorMessage = translations?.passwordTooWeak || 'Password is too weak, please choose a stronger password';
          break;
        case 'auth/network-request-failed':
          errorMessage = translations?.networkError || 'Network error, check your internet connection';
          break;
        default:
          if (error.message) {
            errorMessage = error.message;
          }
      }
      
      showErrorToast(
        translations?.registrationError || 'Registration Error',
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = () => {
    if (returnTo) {
      navigate(returnTo);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <GoogleOneTap onSuccess={handleGoogleSuccess} />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img 
            src="https://i.ibb.co/hx0kCnf4/R8ESTATE.png" 
            alt="R8ESTATE Logo" 
            className="w-16 h-16 object-contain rounded-full"
            style={{ borderRadius: '20%' }}
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          {translations?.createAccount || 'Create Account'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {translations?.registerSubtitle || 'Join the R8 Estate community'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-slideInUp">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="animate-slideInLeft" style={{ animationDelay: '0.1s' }}>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.fullName || 'Full Name'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto pl-3 rtl:pr-3 rtl:pl-0 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-3 text-gray-900 shadow-sm placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder={translations?.fullNamePlaceholder || 'Enter your full name'}
                />
              </div>
            </div>

            {/* Email */}
            <div className="animate-slideInLeft" style={{ animationDelay: '0.2s' }}>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.email || 'Email'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto pl-3 rtl:pr-3 rtl:pl-0 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-3 text-gray-900 shadow-sm placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder={translations?.emailPlaceholder || 'Enter your email address'}
                />
              </div>
            </div>

            {/* Password */}
            <div className="animate-slideInLeft" style={{ animationDelay: '0.3s' }}>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.password || 'Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto pl-3 rtl:pr-3 rtl:pl-0 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 pl-10 rtl:pr-10 rtl:pl-3 pr-12 rtl:pr-3 rtl:pl-12 py-3 text-gray-900 shadow-sm placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder={translations?.passwordPlaceholder || 'Enter your password'}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto pr-3 rtl:pl-3 rtl:pr-0 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="animate-slideInLeft" style={{ animationDelay: '0.4s' }}>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.confirmPassword || 'Confirm Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto pl-3 rtl:pr-3 rtl:pl-0 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="block w-full rounded-md border border-gray-300 pl-10 rtl:pr-10 rtl:pl-3 pr-12 rtl:pr-3 rtl:pl-12 py-3 text-gray-900 shadow-sm placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder={translations?.confirmPasswordPlaceholder || 'Confirm your password'}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto pr-3 rtl:pl-3 rtl:pr-0 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="animate-slideInLeft" style={{ animationDelay: '0.5s' }}>
              <div className="flex items-center">
                <input
                  id="agreeToTerms"
                  name="agreeToTerms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="agreeToTerms" className="ml-2 rtl:mr-2 rtl:ml-0 block text-sm text-gray-700">
                  {translations?.agreeToTerms || 'I agree to the'}{' '}
                  <button
                    type="button"
                    onClick={() => onNavigate('terms')}
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    {translations?.termsOfService || 'Terms of Service'}
                  </button>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="animate-slideInUp" style={{ animationDelay: '0.6s' }}>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
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
                <span className="absolute left-0 rtl:right-0 rtl:left-auto inset-y-0 flex items-center pl-3 rtl:pr-3 rtl:pl-0">
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <UserPlus className="h-5 w-5 text-white group-hover:text-gray-200" />
                  )}
                </span>
                {loading ? (translations?.creatingAccount || 'Creating Account...') : (translations?.createAccount || 'Create Account')}
              </button>
            </div>
          </form>

          <div className="mt-6 animate-slideInUp" style={{ animationDelay: '0.7s' }}>
            <div className="text-center">
              <span className="text-sm text-gray-600">
                {translations?.haveAccount || 'Already have an account?'}{' '}
                <button
                  onClick={() => {
                    if (returnTo) {
                      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
                    } else {
                      onNavigate('login');
                    }
                  }}
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
                >
                  {translations?.login || 'Sign in'}
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;