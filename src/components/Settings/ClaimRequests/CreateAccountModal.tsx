import React, { useState } from 'react';
import { X, Check, Mail, User, Key } from 'lucide-react';
import { ClaimRequest } from '../../../types/company';

interface CreateAccountModalProps {
  request: ClaimRequest;
  onClose: () => void;
  onCreateAccount: (formData: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  actionLoading: boolean;
  translations: any;
}

const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  request,
  onClose,
  onCreateAccount,
  actionLoading,
  translations
}) => {
  const [formData, setFormData] = useState({
    email: request.businessEmail,
    password: request.password || '',
    displayName: request.requesterName || request.companyName
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateAccount(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-bold mb-4">
            {translations?.createAccountTitle || 'Create Company Account'}
          </h3>
          <p className="text-gray-600 mb-6">
            {translations?.createAccountForCompany?.replace('{company}', request.companyName) || 
             `Creating an account for ${request.companyName}`}
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.fullName || 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full pl-10 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                {translations?.email || 'Email'}
                <span className="text-xs text-blue-600">Business Email</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.setPassword || 'Password'}
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 py-2 border border-gray-300 rounded-lg"
                  placeholder={translations?.enterAccountPassword || 'Enter account password (min 6 characters)'}
                  minLength={6}
                />
              </div>
              {formData.password && formData.password.length < 6 && (
                <p className="text-xs text-red-500 mt-1">
                  {translations?.passwordTooShort || 'Password must be at least 6 characters long'}
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
              <button
                type="submit"
                disabled={actionLoading || formData.password.length < 6}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {actionLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>{translations?.createAccount || 'Create Account'}</span>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-400"
              >
                {translations?.cancel || 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateAccountModal;