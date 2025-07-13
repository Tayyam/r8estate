import React from 'react';
import { ClaimRequest, Company } from '../../../types/company';
import { Copy } from 'lucide-react';
import AccountInfoSection from './AccountInfoSection';

interface ClaimRequestDetailsProps {
  request: ClaimRequest;
  companyDetails: Company | null;
  translations: any;
  onClose: () => void;
}

const ClaimRequestDetails: React.FC<ClaimRequestDetailsProps> = ({
  request,
  companyDetails,
  translations,
  onClose
}) => {
  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white rounded-xl p-8 text-center">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Account Details */}
        <AccountInfoSection
          title={translations?.businessAccountDetails || 'Business Account Details'}
          email={request.businessEmail}
          userId={request.userId}
          password={request.password}
          isVerified={request.businessEmailVerified}
          translations={translations}
          copyToClipboard={copyToClipboard}
        />
        
        {/* Supervisor Account Details */}
        <AccountInfoSection
          title={translations?.supervisorAccountDetails || 'Supervisor Account Details'}
          email={request.supervisorEmail}
          userId={request.supervisorId}
          password={request.supervisorPassword}
          isVerified={request.supervisorEmailVerified}
          isSupervisor={true}
          translations={translations}
          copyToClipboard={copyToClipboard}
        />
        
        {/* Additional Info */}
        <div className="md:col-span-2">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Tracking Number:</span>
                <span className="ml-2 font-medium">{request.trackingNumber}</span>
              </div>
              <div>
                <span className="text-gray-600">Domain Verified:</span>
                <span className={`ml-2 font-medium ${
                  request.domainVerified 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {request.domainVerified 
                    ? 'Yes' 
                    : 'No'
                  }
                </span>
              </div>
              <div>
                <span className="text-gray-600">Contact Phone:</span>
                <span className="ml-2 font-medium">
                  {request.contactPhone || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <span className="ml-2 font-medium">
                  {request.createdAt.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <button 
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              onClick={onClose}
            >
              Close Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimRequestDetails;