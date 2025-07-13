import React, { useState } from 'react';
import { SearchCode, Check, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { ClaimRequest } from '../../../types/company';

interface TrackingModalProps {
  initialTrackingNumber?: string;
  onClose: () => void;
  translations: any;
}

const TrackingModal: React.FC<TrackingModalProps> = ({ initialTrackingNumber = '', onClose, translations }) => {
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [foundRequest, setFoundRequest] = useState<ClaimRequest | null>(null);

  // Automatically search if initial tracking number is provided
  React.useEffect(() => {
    if (initialTrackingNumber) {
      handleSearch();
    }
  }, []);

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

  // Remove request from localStorage and optionally database
  const handleRemoveRequest = async (deleteFromDb = false) => {
    try {
      setDeleteLoading(true);
      
      // Remove from localStorage
      localStorage.removeItem('claimTrackingNumber');
      
      // Optionally delete from database if user confirms
      if (deleteFromDb && foundRequest) {
        if (window.confirm(translations?.confirmDeleteRequest || 'Are you sure you want to delete this request? This cannot be undone.')) {
          await deleteDoc(doc(db, 'claimRequests', foundRequest.id));
          setSuccess(translations?.requestDeleted || 'Request deleted successfully');
          
          // Reset state
          setFoundRequest(null);
          setTrackingNumber('');
          
          // Close modal after short delay
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } else {
        setSuccess(translations?.trackingRemoved || 'Tracking number removed from this device');
        
        // Close modal after short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Error removing request:', error);
      setError(translations?.failedToRemoveRequest || 'Failed to remove request');
    } finally {
      setDeleteLoading(false);
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

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-start">
              <Check className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
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
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
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
              
                  <span>{translations?.editRequest || 'Edit Request'}</span>
                </button>
                <button
                      className="px-3 py-1 flex items-center space-x-1 rtl:space-x-reverse text-sm text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 ml-auto"
                  disabled={deleteLoading}
                  className="px-3 py-1 flex items-center space-x-1 rtl:space-x-reverse text-sm text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                >
                  {deleteLoading ? <div className="h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-1"></div> : <Trash2 className="h-4 w-4" />}
                  <span>{translations?.deleteRequest || 'Delete Request'}</span>
                </button>
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

            {initialTrackingNumber && !loading && (
              <button
                onClick={() => handleRemoveRequest(false)}
                disabled={deleteLoading}
                className="flex-1 bg-gray-100 text-gray-600 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse mr-3"
              >
                <span>{translations?.forgetTracking || 'Forget Tracking'}</span>
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