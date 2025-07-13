import React, { useState } from 'react';
import { SearchCode, Check, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { ClaimRequest } from '../../../types/company';

interface TrackingModalProps {
  onClose: () => void;
  translations: any;
}

const TrackingModal: React.FC<TrackingModalProps> = ({ onClose, translations }) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [foundRequest, setFoundRequest] = useState<ClaimRequest | null>(null);

  const handleSearch = async () => {
    if (!trackingNumber || trackingNumber.length !== 6) {
      setError(translations?.invalidTrackingNumber || 'Please enter a valid 6-digit tracking number');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const claimRequestsQuery = query(
        collection(db, 'claimRequests'),
        where('trackingNumber', '==', trackingNumber)
      );
      
      const snapshot = await getDocs(claimRequestsQuery);
      
      if (snapshot.empty) {
        setError(translations?.noRequestFound || 'No claim request found with this tracking number');
        setFoundRequest(null);
        return;
      }
      
      const requestData = snapshot.docs[0].data() as ClaimRequest;
      requestData.id = snapshot.docs[0].id;
      
      // Convert timestamps to dates
      if (requestData.createdAt) {
        requestData.createdAt = requestData.createdAt.toDate();
      }
      if (requestData.updatedAt) {
        requestData.updatedAt = requestData.updatedAt.toDate();
      }
      
      setFoundRequest(requestData);
    } catch (error) {
      console.error('Error searching for tracking number:', error);
      setError(translations?.errorSearchingTracking || 'An error occurred while searching for your request');
    } finally {
      setLoading(false);
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

  // Get status color
  const getStatusColor = (status: string) => {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SearchCode className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {translations?.trackRequest || 'Track Claim Request'}
            </h3>
            <p className="text-gray-600">
              {translations?.enterTrackingDescription || 'Enter your tracking number to check the status of your claim request'}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-700 mb-1">
              {translations?.trackingNumber || 'Tracking Number'} *
            </label>
            <div className="relative mt-1 rounded-md shadow-sm">
              <input
                type="text"
                id="trackingNumber"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={translations?.enterTrackingNumber || 'Enter 6-digit tracking number'}
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value.replace(/\D/g, '').substring(0, 6))}
                maxLength={6}
              />
            </div>
          </div>

          {foundRequest && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-gray-900 mb-3">
                {translations?.requestDetails || 'Request Details'}:
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{translations?.company || 'Company'}:</span>
                  <span className="font-medium">{foundRequest.companyName}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">{translations?.status || 'Status'}:</span>
                  <span className={`px-2 py-0.5 rounded-full ${getStatusColor(foundRequest.status)}`}>
                    {getStatusTranslation(foundRequest.status)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">{translations?.requestDate || 'Request Date'}:</span>
                  <span>{foundRequest.createdAt.toLocaleDateString()}</span>
                </div>
                
                {foundRequest.domainVerified && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{translations?.verification || 'Verification'}:</span>
                    <span className="text-green-600 flex items-center">
                      <Check className="h-4 w-4 mr-1" />
                      {translations?.domainVerified || 'Domain Verified'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 rtl:space-x-reverse">
            {!foundRequest && (
              <button
                onClick={handleSearch}
                disabled={loading || trackingNumber.length !== 6}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : null}
                <span>{translations?.checkStatus || 'Check Status'}</span>
              </button>
            )}
            
            <button
              type="button"
              onClick={onClose}
              className={`${foundRequest ? 'flex-1' : ''} px-6 py-2 bg-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-400 transition-colors duration-200`}
            >
              {translations?.close || 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingModal;