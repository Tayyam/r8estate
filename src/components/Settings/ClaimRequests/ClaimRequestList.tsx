import React from 'react';
import { ClaimRequest, Company } from '../../../types/company';
import { Building2, MessageSquare, CheckCircle, XCircle, User, Copy } from 'lucide-react';
import ClaimRequestDetails from './ClaimRequestDetails';

interface ClaimRequestListProps {
  loading: boolean;
  filteredRequests: ClaimRequest[];
  translations: any;
  showDetails: string | null;
  toggleDetails: (requestId: string) => void;
  onApproveClaim: (request: ClaimRequest) => void;
  setSelectedRequest: (request: ClaimRequest | null) => void;
  setShowDeleteModal: (show: boolean) => void;
  companyDetails: Company | null;
}

const ClaimRequestList: React.FC<ClaimRequestListProps> = ({
  loading,
  filteredRequests,
  translations,
  showDetails,
  toggleDetails, 
  onApproveClaim,
  setSelectedRequest,
  setShowDeleteModal,
  companyDetails
}) => {
  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status translation
  const getStatusTranslation = (status: string) => {
    switch(status) {
      case 'pending':
        return translations?.pending || 'Pending';
      case 'approved':
        return translations?.approved || 'Approved';
      case 'rejected':
        return translations?.rejected || 'Rejected';
      default:
        return status;
    }
  };
  
  // Copy text to clipboard utility function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (filteredRequests.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl shadow-md">
        <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {translations?.noClaimRequests || 'No claim requests yet'}
        </h3>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {translations?.company || 'Company'}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {translations?.requester || 'Requester'}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {translations?.verification || 'Verification'}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {translations?.status || 'Status'}
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {translations?.requestDate || 'Date'}
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              {translations?.actions || 'Actions'}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredRequests.map((request) => (
            <React.Fragment key={request.id}>
              <tr className="hover:bg-gray-50">
                {/* Company */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-gray-200">
                        <Building2 className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{request.companyName}</div>
                      </div>
                    </div>
                    
                    {/* View Details Button */}
                    <button
                      onClick={() => toggleDetails(request.id)}
                      className={`text-xs py-1 px-2 rounded ${
                        showDetails === request.id 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {showDetails === request.id ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </td>
                  
                {/* Requester */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{request.requesterName || 'Guest User'}</div>
                  <div className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded inline-block mt-1">
                    #{request.trackingNumber}
                  </div>
                </td>
                
                {/* Verification */}
                <td className="px-6 py-4 whitespace-nowrap">
                  {/* Business Email Verification */}
                  <div className="flex items-center mb-2">
                    <div className={`inline-flex items-center mr-2 text-xs px-2 py-0.5 rounded-full ${
                      request.businessEmailVerified 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {request.businessEmailVerified 
                        ? <CheckCircle className="h-3 w-3 mr-1" />
                        : <XCircle className="h-3 w-3 mr-1" />
                      }
                      Business
                    </div>
                  </div>
                  
                  {/* Supervisor Email Verification */}
                  <div className="flex items-center">
                    <div className={`inline-flex items-center mr-2 text-xs px-2 py-0.5 rounded-full ${
                      request.supervisorEmailVerified 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {request.supervisorEmailVerified 
                        ? <CheckCircle className="h-3 w-3 mr-1" />
                        : <XCircle className="h-3 w-3 mr-1" />
                      }
                      Supervisor
                    </div>
                  </div>
                </td>
                
                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getStatusBadgeColor(request.status)}`}>
                    {getStatusTranslation(request.status)}
                  </span>
                  <div className="mt-1">
                    {request.domainVerified && (
                      <span className="ml-2 px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full bg-green-100 text-green-800">
                        {translations?.domainVerified || 'Domain Verified'}
                      </span>
                    )}
                  </div>
                </td>
                
                {/* Date */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {request.createdAt.toLocaleDateString()}
                </td>
                
                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {request.status === 'pending' && !request.domainVerified && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            onApproveClaim(request);
                          }}
                          className="text-green-600 hover:text-green-900 px-2 py-1 rounded hover:bg-green-50 disabled:opacity-50"
                        >
                          {translations?.approve || 'Approve'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50"
                        >
                          {translations?.delete || 'Delete'}
                        </button>
                      </>
                    )}
                    {request.status !== 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50"
                      >
                        {translations?.delete || 'Delete'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              
              {/* Details Panel */}
              {showDetails === request.id && (
                <tr className="bg-gray-50">
                  <td colSpan={7} className="px-6 py-4">
                    <ClaimRequestDetails 
                      request={request} 
                      companyDetails={companyDetails} 
                      translations={translations}
                      onClose={() => setShowDetails(null)}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClaimRequestList;