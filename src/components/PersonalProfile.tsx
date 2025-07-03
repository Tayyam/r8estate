import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ProfilePhoto from './PersonalProfile/ProfilePhoto';
import BasicInfo from './PersonalProfile/BasicInfo';
import PasswordSecurity from './PersonalProfile/PasswordSecurity';

interface PersonalProfileProps {
  onNavigate: (page: string) => void;
}

const PersonalProfile: React.FC<PersonalProfileProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Success message handler
  const handleSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  // Error message handler
  const handleError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), 3000);
  };

  // Redirect non-user accounts
  useEffect(() => {
    if (!currentUser || currentUser.role === 'company') {
      onNavigate('home');
    }
  }, [currentUser, onNavigate]);

  if (!currentUser || currentUser.role === 'company') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            {translations?.accessDenied || 'Access Denied'}
          </h2>
          <p className="text-gray-600 mb-6">
            {translations?.accessDeniedDesc || 'This page is only available for users and administrators.'}
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            {translations?.goToHome || 'Go to Home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4 rtl:space-x-reverse mb-6">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-800 transition-colors duration-200 rounded-lg hover:bg-gray-100 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>{translations?.backToHome || 'Back to Home'}</span>
            </button>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#194866' }}>
              {translations?.personalProfile || 'Personal Profile'}
            </h1>
            <p className="text-lg text-gray-600">
              {translations?.personalProfileSubtitle || 'Manage your personal information and account settings'}
            </p>
          </div>
        </div>
      </section>

      {/* Success/Error Messages */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* Profile Photo Section */}
          <ProfilePhoto 
            setError={handleError}
            setSuccess={handleSuccess}
          />

          {/* Basic Information Section */}
          <BasicInfo 
            setError={handleError}
            setSuccess={handleSuccess}
          />

          {/* Password & Security Section */}
          <PasswordSecurity 
            setError={handleError}
            setSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  );
};

export default PersonalProfile;