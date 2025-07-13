import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useNotification } from '../../../contexts/NotificationContext';
import { ClaimRequest, Company } from '../../../types/company';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../config/firebase';
import { Tag, Search, Filter, AlertCircle, Check, ArrowLeft, ArrowRight } from 'lucide-react';
import ClaimRequestList from './ClaimRequestList';
import CreateAccountModal from './CreateAccountModal';
import DeleteRequestModal from './DeleteRequestModal';

// ClaimRequests component for admin settings
const ClaimRequests: React.FC = () => {
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
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState<Company | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [refreshLoading, setRefreshLoading] = useState<string | null>(null);

  // Initialize the cloud function for creating users
  const createUserFunction = httpsCallable(functions, 'createUser');
  const checkEmailVerificationFunction = httpsCallable(functions, 'checkBusinessEmailVerification');

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

  // Create account for approved request
  const handleCreateAccount = async (formData: {
    email: string;
    password: string;
    displayName: string;
  }) => {
    if (!selectedRequest) return;

    try {
      setActionLoading(selectedRequest.id);
      
      // Create user account for the company
      const result = await createUserFunction({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName || selectedRequest.requesterName || selectedRequest.companyName,
        role: 'company'
      });
      
      const data = result.data as any;
      
      if (data.success) {
        // Update claim request status
        await updateDoc(doc(db, 'claimRequests', selectedRequest.id), {
          status: 'approved',
          updatedAt: new Date()
        });
        
        // Update company document
        await updateDoc(doc(db, 'companies', selectedRequest.companyId), {
          claimed: true,
          email: formData.email,
          phone: selectedRequest.contactPhone || '',
          updatedAt: new Date()
        });
        
        setSuccess(translations?.requestApprovedSuccess || 'Claim request approved successfully');
        setTimeout(() => setSuccess(''), 5000);
        
        // Reload data
        loadClaimRequests();
      } else {
        throw new Error(data.error || 'Failed to create user account');
      }

      setShowCreateAccountModal(false);
      setSelectedRequest(null);
      
    } catch (error: any) {
      console.error('Error processing account:', error);
      setError(error.message || (translations?.failedToProcessRequest || 'Failed to process request'));
      setTimeout(() => setError(''), 5000);
    } finally {
      setActionLoading(null);
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

  // Handle refresh verification status
  const handleRefreshVerification = async (requestId: string) => {
    const request = claimRequests.find(r => r.id === requestId);
    if (!request) return;

    try {
      setRefreshLoading(requestId);
      
      // Check verification status for both business and supervisor emails
      const businessResult = await checkEmailVerificationFunction({
        userId: request.userId,
        claimRequestId: requestId,
        companyId: request.companyId,
        isSupervisor: false
      });

      const supervisorResult = await checkEmailVerificationFunction({
        userId: request.supervisorId,
        claimRequestId: requestId,
        companyId: request.companyId,
        isSupervisor: true
      });

      const businessData = businessResult.data as any;
      const supervisorData = supervisorResult.data as any;

      if (businessData?.bothVerified || supervisorData?.bothVerified) {
        showSuccessToast(translations?.claimProcessedSuccess || 'Company claim processed successfully!');
      } else {
        showSuccessToast(translations?.verificationStatusUpdated || 'Verification status updated successfully');
      }

      // Reload claim requests to show updated status
      await loadClaimRequests();
      
    } catch (error: any) {
      console.error('Error refreshing verification status:', error);
      showErrorToast(error.message || (translations?.failedToRefreshStatus || 'Failed to refresh verification status'));
    } finally {
      setRefreshLoading(null);
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
        setShowCreateAccountModal={setShowCreateAccountModal}
        setSelectedRequest={setSelectedRequest}
        setShowDeleteModal={setShowDeleteModal}
       refreshLoading={refreshLoading}
       handleRefreshVerification={handleRefreshVerification}
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
          <span className="text-sm text-gray-600">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50"
          >
            <ArrowRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateAccountModal && selectedRequest && (
        <CreateAccountModal
          request={selectedRequest}
          onClose={() => {
            setShowCreateAccountModal(false);
            setSelectedRequest(null);
          }}
          onCreateAccount={handleCreateAccount}
          actionLoading={actionLoading === selectedRequest.id}
          translations={translations}
        />
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