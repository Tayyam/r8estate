import React, { useState, useEffect } from 'react';
import { 
  Building2, Search, Check, X, AlertCircle, Calendar, 
  Phone, Mail, ChevronDown, ChevronUp, ArrowLeft, ArrowRight, 
  MessageSquare, Eye, Trash2
} from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { ClaimRequest } from '../../types/company';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

// ClaimRequests component for admin settings
const ClaimRequests: React.FC = () => {
  const { translations } = useLanguage();
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ClaimRequest | null>(null);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Items per page for pagination
  const ITEMS_PER_PAGE = 10;

  // Initialize the cloud function for creating users
  const createUserFunction = httpsCallable(functions, 'createUser');

  // Load claim requests from Firestore
  const loadClaimRequests = async () => {
    try {
      setLoading(true);
      
      // Create query based on status filter
      let claimRequestsQuery;
      if (statusFilter === 'all') {
        claimRequestsQuery = query(
          collection(db, 'claimRequests'),
          orderBy('createdAt', 'desc')
        );
      } else {
        claimRequestsQuery = query(
          collection(db, 'claimRequests'),
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(claimRequestsQuery);
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as ClaimRequest[];
      
      setClaimRequests(requestsData);
    } catch (err) {
      console.error('Error loading claim requests:', err);
      setError(translations?.failedToLoadRequests || 'Failed to load claim requests');
    } finally {
      setLoading(false);
    }
  };

  // Load requests on component mount and when status filter changes
  useEffect(() => {
    loadClaimRequests();
  }, [statusFilter]);

  // Filter requests based on search query
  const filteredRequests = claimRequests.filter(request => {
    const searchLower = searchQuery.toLowerCase();
    return (
      request.companyName.toLowerCase().includes(searchLower) ||
      request.businessEmail.toLowerCase().includes(searchLower) ||
      request.supervisorEmail.toLowerCase().includes(searchLower) ||
      request.contactPhone.includes(searchQuery)
    );
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Toggle request details expansion
  const toggleExpand = (requestId: string) => {
    if (expandedRequestId === requestId) {
      setExpandedRequestId(null);
    } else {
      setExpandedRequestId(requestId);
    }
  };

  // Handle create account
  const handleCreateAccount = async () => {
    if (!selectedRequest) return;
    
    if (!accountPassword || accountPassword.length < 6) {
      setError(translations?.passwordTooShort || 'Password must be at least 6 characters long');
      return;
    }

    try {
      setActionLoading(selectedRequest.id);
      
      // Create user account for the company
      const result = await createUserFunction({
        email: selectedRequest.supervisorEmail,
        password: accountPassword,
        displayName: selectedRequest.companyName,
        role: 'company'
      });
      
      const data = result.data as any;
      
      if (data.success) {
        // Update claim request status
        await updateDoc(doc(db, 'claimRequests', selectedRequest.id), {
          status: 'approved',
          notes: adminNotes,
          updatedAt: new Date()
        });
        
        // Update company document
        await updateDoc(doc(db, 'companies', selectedRequest.companyId), {
          claimed: true,
          email: selectedRequest.supervisorEmail,
          phone: selectedRequest.contactPhone,
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
      setAccountPassword('');
      setAdminNotes('');
      
    } catch (error: any) {
      console.error('Error creating account:', error);
      setError(error.message || (translations?.failedToApproveRequest || 'Failed to create account'));
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

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Section Header */}
      <div className="px-4 sm:px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Building2 className="h-6 w-6" style={{ color: '#194866' }} />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#194866' }}>
                {translations?.claimRequestManagement || 'Claim Request Management'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? (
                  translations?.loadingRequests || 'Loading requests...'
                ) : (
                  translations?.totalRequests?.replace('{count}', claimRequests.length.toString()) || 
                  `Total requests: ${claimRequests.length}`
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="mx-4 sm:mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm sm:text-base">{error}</p>
        </div>
      )}

      {success && (
        <div className="mx-4 sm:mx-8 mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700 text-sm sm:text-base">{success}</p>
        </div>
      )}

      {/* Search and Filter */}
      <div className="px-4 sm:px-8 py-4 border-b border-gray-200">
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
            />
          </div>
          
          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
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
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery 
                ? translations?.noRequestsFound || 'No claim requests found matching your search' 
                : statusFilter !== 'all'
                  ? translations?.noRequestsWithStatus?.replace('{status}', getStatusTranslation(statusFilter).toLowerCase()) || `No ${statusFilter} claim requests found`
                  : translations?.noClaimRequests || 'No claim requests yet'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedRequests.map(request => (
              <div 
                key={request.id} 
                className={`bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 ${
                  request.status === 'pending' ? 'border-l-4 border-l-yellow-400' : 
                  request.status === 'approved' ? 'border-l-4 border-l-green-400' : 
                  'border-l-4 border-l-red-400'
                }`}
              >
                {/* Request Header */}
                <div 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 bg-gray-50 cursor-pointer"
                  onClick={() => toggleExpand(request.id)}
                >
                  <div className="flex items-center space-x-3 rtl:space-x-reverse mb-3 sm:mb-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                        {request.companyName}
                      </h3>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{request.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(request.status)}`}>
                      {getStatusTranslation(request.status)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(request.id);
                      }}
                      className="p-1.5 hover:bg-gray-200 rounded-full"
                    >
                      {expandedRequestId === request.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Request Details (Expanded) */}
                {expandedRequestId === request.id && (
                  <div className="p-4 sm:p-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* Contact Information */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900 mb-2">
                          {translations?.contactInformation || 'Contact Information'}
                        </h4>
                        <div className="flex items-start space-x-2 rtl:space-x-reverse text-sm">
                          <Phone className="h-4 w-4 text-gray-500 mt-0.5" />
                          <span className="text-gray-700">{request.contactPhone}</span>
                        </div>
                        <div className="flex items-start space-x-2 rtl:space-x-reverse text-sm">
                          <Mail className="h-4 w-4 text-gray-500 mt-0.5" />
                          <span className="text-gray-700">{request.businessEmail}</span>
                        </div>
                        <div className="flex items-start space-x-2 rtl:space-x-reverse text-sm">
                          <Mail className="h-4 w-4 text-gray-500 mt-0.5" />
                          <span className="text-gray-700">{request.supervisorEmail}</span>
                        </div>
                      </div>
                      
                      {/* Requester Information */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900 mb-2">
                          {translations?.requestDetails || 'Request Details'}
                        </h4>
                        {request.requesterName && (
                          <div className="flex items-start space-x-2 rtl:space-x-reverse text-sm">
                            <span className="text-gray-500">{translations?.requester || 'Requester'}:</span>
                            <span className="text-gray-700">{request.requesterName}</span>
                          </div>
                        )}
                        <div className="flex items-start space-x-2 rtl:space-x-reverse text-sm">
                          <span className="text-gray-500">{translations?.requestDate || 'Request Date'}:</span>
                          <span className="text-gray-700">{request.createdAt.toLocaleString()}</span>
                        </div>
                        <div className="flex items-start space-x-2 rtl:space-x-reverse text-sm">
                          <span className="text-gray-500">{translations?.status || 'Status'}:</span>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeColor(request.status)}`}>
                            {getStatusTranslation(request.status)}
                          </span>
                        </div>
                        {request.notes && (
                          <div className="pt-2">
                            <span className="text-gray-500 text-sm">{translations?.adminNotes || 'Admin Notes'}:</span>
                            <p className="text-gray-700 text-sm mt-1 p-2 bg-gray-50 rounded-lg border border-gray-100">
                              {request.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    {request.status === 'pending' ? (
                      <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-gray-100">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowCreateAccountModal(true);
                          }}
                          disabled={actionLoading === request.id}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-1 rtl:space-x-reverse"
                        >
                          <Check className="h-4 w-4" />
                          <span>{translations?.createAccount || 'Create Account'}</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDeleteModal(true);
                          }}
                          disabled={actionLoading === request.id}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors duration-200 flex items-center space-x-1 rtl:space-x-reverse"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>{translations?.deleteRequest || 'Delete Request'}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-gray-100">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowDeleteModal(true);
                          }}
                          disabled={actionLoading === request.id}
                          className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-1 rtl:space-x-reverse"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>{translations?.deleteRequest || 'Delete Request'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-8">
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
          </div>
        )}
      </div>

      {/* Delete Request Modal */}
      {showDeleteModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {translations?.deleteRequest || 'Delete Request'}
              </h3>
              <p className="text-gray-600 mb-6">
                {translations?.deleteRequestConfirmation?.replace('{company}', selectedRequest.companyName) || 
                 `Are you sure you want to delete the claim request for ${selectedRequest.companyName}? This action cannot be undone.`}
              </p>
              
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
                <button
                  onClick={handleDeleteRequest}
                  disabled={actionLoading === selectedRequest.id}
                  className="w-full sm:w-auto flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  {actionLoading === selectedRequest.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  <span>{translations?.deleteRequest || 'Delete Request'}</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedRequest(null);
                  }}
                  className="w-full sm:w-auto flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors duration-200"
                >
                  {translations?.cancel || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Account Modal */}
      {showCreateAccountModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">{translations?.createAccount || 'Create Account'}</h3>
            <p className="text-gray-600 mb-4">
              {translations?.createAccountForCompany?.replace('{company}', selectedRequest.companyName) || 
               `Creating an account for ${selectedRequest.companyName} using the supervisor email: ${selectedRequest.supervisorEmail}`}
            </p>
            
            {/* Email Display - Read Only */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.email || 'Email'}
              </label>
              <input
                type="text"
                value={selectedRequest.supervisorEmail}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
              />
              <p className="text-xs text-gray-500 mt-1">
                {translations?.cantChangeEmail || 'Email cannot be changed'}
              </p>
            </div>
            
            {/* Password Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.setPassword || 'Set Password'} *
              </label>
              <input
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={translations?.enterAccountPassword || 'Enter account password (min 6 characters)'}
                minLength={6}
              />
              {accountPassword.length > 0 && accountPassword.length < 6 && (
                <p className="text-xs text-red-500 mt-1">
                  {translations?.passwordTooShort || 'Password must be at least 6 characters long'}
                </p>
              )}
            </div>
            
            {/* Admin Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {translations?.adminNotes || 'Admin Notes'} ({translations?.optional || 'optional'})
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20"
                placeholder={translations?.enterNotesForAccount || 'Enter any notes about this account...'}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
              <button
                onClick={handleCreateAccount}
                disabled={actionLoading === selectedRequest.id || !accountPassword || accountPassword.length < 6}
                className="w-full sm:w-auto flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
              >
                {actionLoading === selectedRequest.id ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                <span>{translations?.createAccount || 'Create Account'}</span>
              </button>
              
              <button
                onClick={() => {
                  setShowCreateAccountModal(false);
                  setSelectedRequest(null);
                  setAccountPassword('');
                  setAdminNotes('');
                }}
                className="w-full sm:w-auto flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors duration-200"
              >
                {translations?.cancel || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimRequests;