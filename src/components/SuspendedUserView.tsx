import React from 'react';
import { AlertOctagon, Mail } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const SuspendedUserView = () => {
  const { translations } = useLanguage();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertOctagon className="h-10 w-10 text-red-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {translations?.accountSuspended || 'حسابك موقوف'}
        </h2>
        
        <p className="text-gray-600 mb-6 text-lg">
          {translations?.accountSuspendedMessage || 
           'تم إيقاف حسابك. يرجى التواصل مع الدعم الفني للمساعدة.'}
        </p>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-4 mb-8">
          <a
            href="mailto:info@r8estate.com"
            className="inline-flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Mail className="h-5 w-5" />
            <span>info@r8estate.com</span>
          </a>
          
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {translations?.logout || 'تسجيل الخروج'}
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          <p>{translations?.accountSuspendedExplanation || 'إذا كنت تعتقد أن هذا خطأ، يرجى الاتصال بنا مباشرة.'}</p>
        </div>
      </div>
    </div>
  );
};

export default SuspendedUserView;