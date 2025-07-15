import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { ClaimRequest, Company } from '../../../types/company';
import { Tag, Search, Filter, AlertCircle, Check, ArrowLeft, ArrowRight, Loader, Mail, Send, Building2 } from 'lucide-react';
import ClaimRequestList from './ClaimRequestList';
import DeleteRequestModal from './DeleteRequestModal';

// ClaimRequests component for admin settings
const ClaimRequests = () => {
  const { translations } = useLanguage();
  const { showSuccessToast, showErrorToast } = useNotification();
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<ClaimRequest | null>(null);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState<Company | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Loading modal state
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Initialize the cloud functions
  const claimProcessNonDomainFunction = httpsCallable(functions, 'claimProcessNonDomain');

  // Load claim requests from Firestore
  const loadClaimRequests = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'claimRequests'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const requests: ClaimRequest[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as ClaimRequest);
      });
      
      setClaimRequests(requests);
    } catch (error) {
      console.error('Error loading claim requests:', error);
      setError(translations?.failedToLoadRequests || 'Failed to load claim requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaimRequests();
  }, []);

  // Filter claim requests based on search query and filter
  const filteredRequests = claimRequests.filter(request => {
    const matchesSearch = 
      request.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.businessEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.requesterName && request.requesterName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (request.trackingNumber && request.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = filter === 'all' || request.status === filter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle approve claim request
  const handleApproveClaim = async (request: ClaimRequest) => {
    if (!request) return;
    
    // Show loading modal
    setShowLoadingModal(true);
    setLoadingStep(translations?.initializingApproval || 'Initializing approval process...');
    setLoadingProgress(10);
    
    try {
      setActionLoading(request.id);
      setError('');
      
      // Update loading state
      setLoadingStep(translations?.sendingVerificationEmails || 'Sending verification emails...');
      setLoadingProgress(30);
      
      // Call the claimProcessNonDomain cloud function - pass only the request ID
      const result = await claimProcessNonDomainFunction({
        claimRequestId: request.id
      });
      const data = result.data as any;
      
      if (data.success) {
        // Update loading state
        setLoadingStep(translations?.updatingClaimStatus || 'Updating claim status...');
        setLoadingProgress(85);
        
        // Update request status in Firestore
        await updateDoc(doc(db, 'claimRequests', request.id), {
          status: 'approved',
          updatedAt: new Date()
        });
        
        // Complete loading
        setLoadingStep(translations?.approvalCompleted || 'Approval completed successfully!');
        setLoadingProgress(100);
        
        setSuccess(translations?.requestApprovedSuccess || 'Claim request approved and verification emails sent successfully');
        setTimeout(() => setSuccess(''), 5000);
        
        // Update local state
        setClaimRequests(prev => prev.map(req => 
          req.id === request.id ? { ...req, status: 'approved' } : req
        ));
      } else {
        throw new Error(data.message || 'Failed to approve claim request');
      }
    } catch (error) {
      console.error('Error approving claim request:', error);
      setError(error.message || (translations?.failedToProcessRequest || 'Failed to approve request'));
      setLoadingStep(translations?.approvalFailed || 'Approval process failed');
      setTimeout(() => setError(''), 5000);
    } finally {
      setActionLoading(null);
      // Close loading modal after a short delay to show final state
      setTimeout(() => {
        setShowLoadingModal(false);
        setLoadingProgress(0);
        setLoadingStep('');
      }, 1500);
    }
  };
  
  // Handle delete request
  const handleDeleteRequest = async () => {
    if (!selectedRequest) return;

    try {
      setActionLoading(selectedRequest.id);
      
      // Delete request document
      await deleteDoc(doc(db, 'claimRequests', selectedRequest.id));
      
      setSuccess(translations?.requestDeletedSuccess || 'Claim request deleted successfully');
      setTimeout(() => setSuccess(''), 5000);
      
      // Update local state
      setClaimRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
      
      setShowDeleteModal(false);
      setSelectedRequest(null);
      
    } catch (error) {
      console.error('Error deleting request:', error);
      setError(translations?.failedToDeleteRequest || 'Failed to delete request');
      setTimeout(() => setError(''), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle details panel
  const toggleDetails = async (requestId: string) => {
    if (showDetails === requestId) {
      setShowDetails(null);
      return;
    }
    
    setShowDetails(requestId);
    
    // Get the selected request
    const request = claimRequests.find(r => r.id === requestId);
    if (request) {
      try {
        // Fetch company details
        const companyDoc = await getDoc(doc(db, 'companies', request.companyId));
        if (companyDoc.exists()) {
          setCompanyDetails({
            id: companyDoc.id,
            ...companyDoc.data(),
            createdAt: companyDoc.data().createdAt?.toDate() || new Date(),
            updatedAt: companyDoc.data().updatedAt?.toDate() || new Date()
          } as Company);
        }
      } catch (error) {
        console.error('Error fetching company details:', error);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Section Header */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Tag className="h-6 w-6" style={{ color: '#194866' }} />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#194866' }}>
                {translations?.claimRequestManagement || 'Claim Request Management'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? (
                  translations?.loadingRequests || 'Loading requests...'
                ) : (
                  <>
                    {translations?.totalRequests?.replace('{count}', claimRequests.length.toString()) || 
                    `Total requests: ${claimRequests.length}`}
                    {' | '}
                    <span className="text-yellow-600">
                      {claimRequests.filter(r => r.status === 'pending').length} Pending
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      <div>
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm sm:text-base">{error}</p>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
            <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700 text-sm sm:text-base">{success}</p>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder={translations?.searchRequests || 'Search requests...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
              style={{ 
                focusBorderColor: '#194866',
                focusRingColor: '#194866'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#194866';
                e.target.style.boxShadow = `0 0 0 3px rgba(25, 72, 102, 0.1)`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <div className="w-full sm:w-48">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
              style={{ 
                focusBorderColor: '#194866',
                focusRingColor: '#194866'
              }}
            >
              <option value="all">{translations?.allRequests || 'All Requests'}</option>
              <option value="pending">{translations?.pendingRequests || 'Pending'}</option>
              <option value="approved">{translations?.approvedRequests || 'Approved'}</option>
              <option value="rejected">{translations?.rejectedRequests || 'Rejected'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Claim Requests List */}
      <ClaimRequestList 
        loading={loading}
        filteredRequests={paginatedRequests}
        translations={translations}
        showDetails={showDetails}
        toggleDetails={toggleDetails} 
        onApproveClaim={handleApproveClaim}
        setSelectedRequest={setSelectedRequest}
        setShowDeleteModal={setShowDeleteModal}
        companyDetails={companyDetails}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 p-4 border-t border-gray-200">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      )}

      {/* Loading Modal */}
      {showLoadingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex flex-col items-center justify-center space-y-6">
              {/* Logo and title */}
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {translations?.processingClaimRequest || 'Processing Claim Request'}
                </h3>
              </div>
              
              {/* Current step */}
              <div className="text-center">
                <p className="text-gray-700 font-medium">{loadingStep}</p>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 text-center w-full">
                {loadingProgress}%
              </div>
              
              {/* Step indicators */}
              <div className="w-full grid grid-cols-3 gap-2 mt-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-200 
                    ${loadingProgress >= 10 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Send className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-gray-500">{translations?.initiate || 'Initiate'}</span>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-200 
                    ${loadingProgress >= 40 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-gray-500">{translations?.verify || 'Verify'}</span>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-all duration-200 
                    ${loadingProgress >= 80 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Check className="w-5 h-5" />
                  </div>
                  <span className="text-xs text-gray-500">{translations?.complete || 'Complete'}</span>
                </div>
              </div>
              
              {/* Animated loading indicator at the bottom */}
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 mt-4">
                <Loader className="w-4 h-4 animate-spin" />
                <span>{translations?.pleaseWaitProcessing || 'Please wait while we process the request...'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Request Modal */}
      {showDeleteModal && selectedRequest && (
        <DeleteRequestModal
          request={selectedRequest}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedRequest(null);
          }}
          onDeleteRequest={handleDeleteRequest}
          actionLoading={actionLoading === selectedRequest.id}
          translations={translations}
        />
      )}
    </div>
  );
};

export default ClaimRequests;