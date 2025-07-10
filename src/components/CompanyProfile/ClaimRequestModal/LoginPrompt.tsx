import React from 'react';
import { User } from 'lucide-react';

interface LoginPromptProps {
  onClose: () => void;
  translations: any;
}

const LoginPrompt: React.FC<LoginPromptProps> = ({ onClose, translations }) => {
  // Navigate to login
  const navigateToLogin = () => {
    // Save the current URL to return to after login
    window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <User className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {translations?.loginRequired || 'Login Required'}
        </h3>
        <p className="text-gray-600 mb-6">
          {translations?.loginToClaimCompany || 'You need to be logged in to claim a company. Please log in to continue.'}
        </p>
        <div className="flex space-x-4 justify-center">
          <button
            onClick={navigateToLogin}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
          >
            {translations?.login || 'Login'}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all duration-200"
          >
            {translations?.cancel || 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPrompt;