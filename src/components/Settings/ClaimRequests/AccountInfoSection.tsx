import React from 'react';
import { User, CheckCircle, XCircle } from 'lucide-react';

interface AccountInfoSectionProps {
  title: string;
  email: string;
  // Removed userId and password
  isVerified: boolean;
  isSupervisor?: boolean;
  translations: any;
  copyToClipboard: (text: string) => void;
}

const AccountInfoSection: React.FC<AccountInfoSectionProps> = ({
  title,
  email,
  // Removed userId and password
  isVerified,
  isSupervisor,
  translations,
  copyToClipboard
}) => {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
        <User className="h-4 w-4 text-blue-600 mr-2" />
        <span>{title}</span>
      </h3>
      
      <div className="space-y-3 text-sm">
        <div className="flex items-start">
          <div className="w-32 text-gray-500">Email:</div>
          <div className="text-gray-900 flex items-center">
            {email}
            <button 
              onClick={() => copyToClipboard(email)}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="w-32 text-gray-500">Password:</div>
          <div className="text-gray-900 flex items-center">
            {password || 'N/A'}
            {password && (
              <button 
                onClick={() => copyToClipboard(password)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="w-32 text-gray-500">User ID:</div>
          <div className="text-gray-900 flex items-center">
            <span className="truncate max-w-xs">{userId || 'N/A'}</span>
            {userId && (
              <button 
                onClick={() => copyToClipboard(userId)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-start">
          <div className="w-32 text-gray-500">Verification:</div>
          <div className={`${
            isVerified
              ? 'text-green-600' 
              : 'text-yellow-600'
          } flex items-center`}>
            {isVerified
              ? <><CheckCircle className="h-4 w-4 mr-1" /> Verified</>
              : <><XCircle className="h-4 w-4 mr-1" /> Pending</>
            }
          </div>
        </div>
      </div>
    </div>
  );
};