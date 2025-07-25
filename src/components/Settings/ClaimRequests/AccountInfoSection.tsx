import React from 'react';
import { User, CheckCircle, XCircle, Copy } from 'lucide-react';

interface AccountInfoSectionProps {
  title: string;
  email: string;
  password?: string;
  userId?: string;
  isVerified: boolean;
  isSupervisor?: boolean;
  translations: any;
  copyToClipboard: (text: string) => void;
}

const AccountInfoSection: React.FC<AccountInfoSectionProps> = ({
  title,
  email,
  password,
  userId,
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
export default AccountInfoSection;