import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { ClaimRequest, Company } from '../../types/company';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Tag, 
  Search, 
  Check, 
  AlertCircle, 
  Trash2,
  ArrowLeft,
  ArrowRight,
  Copy,
  CheckCircle,
  XCircle,
  User
} from 'lucide-react';

// ClaimRequests component for admin settings
const ClaimRequests: React.FC = () => {
  const { translations } = useLanguage();
  const { showSuccessToast, showErrorToast } = useNotification();
  const [claimRequests, setClaimRequests] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedRequest, setSelectedRequest] = useState<ClaimRequest | null>(null);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState<Company | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Initialize the cloud function for creating users
  const createUserFunction = httpsCallable(functions, 'createUser');
  
  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        showSuccessToast(
          translations?.copied || 'Copied!',
          translations?.textCopiedToClipboard || 'Text copied to clipboard'
        );
      })
      .catch((err) => {
        console.error('Could not copy text: ', err);
      });
  };
  
  // Check if email exists function
  const checkIfEmailExists = async (email: string): Promise<boolean> => {
    try {
      // Check if email exists in users collection
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      return !usersSnapshot.empty;
    } catch (error) {
      console.error('Error checking if email exists:', error);
      return false;
    }
  };

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

  // Filter and search requests
  const filteredRequests = claimRequests.filter(request => {
    const matchesSearch = 
      request.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.businessEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (request.requesterName && request.requesterName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (request.trackingNumber && request.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
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
  const handleCreateAccount = async () => {
    if (!selectedRequest) return;

    try {
      setActionLoading(selectedRequest.id);
      
      // Use provided password or default to the one from the request
      const finalPassword = accountPassword || selectedRequest.password;

      // First check if the email already exists
      const emailExists = await checkIfEmailExists(selectedRequest.businessEmail);
      
      if (emailExists) {
        // Email exists - update the existing user instead of creating a new one
        try {
          // Find the existing user
          const usersQuery = query(
            collection(db, 'users'),
            where('email', '==', selectedRequest.businessEmail)
          );
          
          const usersSnapshot = await getDocs(usersQuery);
          
          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            const userId = userDoc.id;
            
            // Update user role and company ID
            await updateDoc(doc(db, 'users', userId), {
              role: 'company',
              companyId: selectedRequest.companyId,
              updatedAt: new Date()
            });
            
            // Update claim request status
            await updateDoc(doc(db, 'claimRequests', selectedRequest.id), {
              status: 'approved',
              notes: adminNotes,
              updatedAt: new Date()
            });
            
            // Update company document
            await updateDoc(doc(db, 'companies', selectedRequest.companyId), {
              claimed: true,
              email: selectedRequest.businessEmail,
              phone: selectedRequest.contactPhone || '',
              updatedAt: new Date()
            });
            
            setSuccess(translations?.existingUserAssignedSuccess || 'Existing user assigned to company successfully');
            showSuccessToast(
              translations?.success || 'Success', 
              translations?.existingUserAssignedSuccess || 'Existing user assigned to company successfully'
            );
            
            // Reload data
            loadClaimRequests();
          }
        } catch (error) {
          console.error('Error updating existing user:', error);
          throw new Error(translations?.failedToUpdateExistingUser || 'Failed to update existing user');
        }
      } else {
        // Email doesn't exist - create new account
        if (!finalPassword || finalPassword.length < 6) {
          setError(translations?.passwordTooShort || 'Password must be at least 6 characters long');
          setActionLoading(null);
          return;
        }
        
        // Create user account for the company
        const result = await createUserFunction({
          email: selectedRequest.businessEmail,
          password: finalPassword,
          displayName: selectedRequest.displayName || selectedRequest.requesterName || selectedRequest.companyName,
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
            email: selectedRequest.businessEmail,
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
      }

      setShowCreateAccountModal(false);
      setSelectedRequest(null);
      setAccountPassword('');
      setAdminNotes('');
      
    } catch (error: any) {
      console.error('Error processing account:', error);
      setError(error.message || (translations?.failedToProcessRequest || 'Failed to process request'));
      setTimeout(() => setError(''), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  // Reject claim request
  const handleRejectRequest = async () => {
    if (!selectedRequest) return;

    try {
      setActionLoading(selectedRequest.id);
      
      // Update request status to rejected
      await updateDoc(doc(db, 'claimRequests', selectedRequest.id), {
        status: 'rejected',
        notes: adminNotes,
        updatedAt: new Date()
      });
      
      setSuccess(translations?.requestRejectedSuccess || 'Claim request rejected successfully');
      setTimeout(() => setSuccess(''), 5000);
      
      // Reload data
      loadClaimRequests();
      
      setSelectedRequest(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      setError(translations?.failedToRejectRequest || 'Failed to reject request');
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
            />
          </div>
          
          <div className="w-full sm:w-48">
            <label className="block text-xs text-gray-500 mb-1">Status</label>
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

      {/* Claim Requests Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12 px-6">
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
              {paginatedRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
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
                    {request.status === 'pending' ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowCreateAccountModal(true);
                            setAccountPassword(request.password || '');
                          }}
                          className="text-blue-600 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-50"
                        >
                          {translations?.createAccount || 'Create Account'}
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
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDeleteModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-50"
                      >
                        {translations?.delete || 'Delete'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              
              {/* Details Panel */}
              {showDetails && (
                <tr className="bg-gray-50">
                  <td colSpan={7} className="px-6 py-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Business Account Details */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <User className="h-4 w-4 text-blue-600 mr-2" />
                            Business Account Details
                          </h3>
                          
                          <div className="space-y-3 text-sm">
                            <div className="flex items-start">
                              <div className="w-32 text-gray-500">Email:</div>
                              <div className="text-gray-900 flex items-center">
                                {claimRequests.find(r => r.id === showDetails)?.businessEmail}
                                <button 
                                  onClick={() => copyToClipboard(claimRequests.find(r => r.id === showDetails)?.businessEmail || '')}
                                  className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex items-start">
                              <div className="w-32 text-gray-500">Password:</div>
                              <div className="text-gray-900 flex items-center">
                                {claimRequests.find(r => r.id === showDetails)?.password || 'N/A'}
                                <button 
                                  onClick={() => copyToClipboard(claimRequests.find(r => r.id === showDetails)?.password || '')}
                                  className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex items-start">
                              <div className="w-32 text-gray-500">User ID:</div>
                              <div className="text-gray-900 flex items-center">
                                <span className="truncate max-w-xs">{claimRequests.find(r => r.id === showDetails)?.userId || 'N/A'}</span>
                                <button 
                                  onClick={() => copyToClipboard(claimRequests.find(r => r.id === showDetails)?.userId || '')}
                                  className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex items-start">
                              <div className="w-32 text-gray-500">Verification:</div>
                              <div className={`${
                                claimRequests.find(r => r.id === showDetails)?.businessEmailVerified
                                  ? 'text-green-600' 
                                  : 'text-yellow-600'
                              } flex items-center`}>
                                {claimRequests.find(r => r.id === showDetails)?.businessEmailVerified
                                  ? <><CheckCircle className="h-4 w-4 mr-1" /> Verified</>
                                  : <><XCircle className="h-4 w-4 mr-1" /> Pending</>
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Supervisor Account Details */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <User className="h-4 w-4 text-purple-600 mr-2" />
                            Supervisor Account Details
                          </h3>
                          
                          <div className="space-y-3 text-sm">
                            <div className="flex items-start">
                              <div className="w-32 text-gray-500">Email:</div>
                              <div className="text-gray-900 flex items-center">
                                {claimRequests.find(r => r.id === showDetails)?.supervisorEmail}
                                <button 
                                  onClick={() => copyToClipboard(claimRequests.find(r => r.id === showDetails)?.supervisorEmail || '')}
                                  className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex items-start">
                              <div className="w-32 text-gray-500">Password:</div>
                              <div className="text-gray-900 flex items-center">
                                {claimRequests.find(r => r.id === showDetails)?.supervisorPassword || 'N/A'}
                                <button 
                                  onClick={() => copyToClipboard(claimRequests.find(r => r.id === showDetails)?.supervisorPassword || '')}
                                  className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex items-start">
                              <div className="w-32 text-gray-500">User ID:</div>
                              <div className="text-gray-900 flex items-center">
                                <span className="truncate max-w-xs">{claimRequests.find(r => r.id === showDetails)?.supervisorId || 'N/A'}</span>
                                <button 
                                  onClick={() => copyToClipboard(claimRequests.find(r => r.id === showDetails)?.supervisorId || '')}
                                  className="ml-2 text-blue-600 hover:text-blue-800"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex items-start">
                              <div className="w-32 text-gray-500">Verification:</div>
                              <div className={`${
                                claimRequests.find(r => r.id === showDetails)?.supervisorEmailVerified
                                  ? 'text-green-600' 
                                  : 'text-yellow-600'
                              } flex items-center`}>
                                {claimRequests.find(r => r.id === showDetails)?.supervisorEmailVerified
                                  ? <><CheckCircle className="h-4 w-4 mr-1" /> Verified</>
                                  : <><XCircle className="h-4 w-4 mr-1" /> Pending</>
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Additional Info */}
                        <div className="md:col-span-2">
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-2">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Information</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-600">Tracking Number:</span>
                                <span className="ml-2 font-medium">{claimRequests.find(r => r.id === showDetails)?.trackingNumber}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Domain Verified:</span>
                                <span className={`ml-2 font-medium ${
                                  claimRequests.find(r => r.id === showDetails)?.domainVerified 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                                }`}>
                                  {claimRequests.find(r => r.id === showDetails)?.domainVerified 
                                    ? 'Yes' 
                                    : 'No'
                                  }
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Contact Phone:</span>
                                <span className="ml-2 font-medium">
                                  {claimRequests.find(r => r.id === showDetails)?.contactPhone || 'Not provided'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Created:</span>
                                <span className="ml-2 font-medium">
                                  {claimRequests.find(r => r.id === showDetails)?.createdAt.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex justify-end mt-4">
                            <button 
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                              onClick={() => setShowDetails(null)}
                            >
                              Close Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

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
            <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Check className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {translations?.createAccountTitle || 'Create Company Account'}
                </h3>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              {translations?.createAccountForCompany?.replace('{company}', selectedRequest.companyName) || 
               `Creating an account for ${selectedRequest.companyName}`}
            </p>
            
            <div className="overflow-y-auto max-h-[60vh] p-4">
              {/* Email Input - Editable */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                  {translations?.email || 'Email'}
                  <span className="text-xs text-blue-600">Business Email</span>
                </label>
                <input
                  type="text"
                  value={selectedRequest.businessEmail}
                  onChange={(e) => setSelectedRequest({
                    ...selectedRequest,
                    businessEmail: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Password Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {translations?.setPassword || 'Password'} 
                  {accountPassword !== selectedRequest.password && selectedRequest.password && 
                   <span className="text-xs text-gray-500 ml-2">
                     ({translations?.originalPasswordAvailable || 'Original password available'})
                   </span>
                  }
                </label>
                <input
                  type="text"
                  value={accountPassword || selectedRequest?.password || ''}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={translations?.enterAccountPassword || 'Enter account password (min 6 characters)'}
                />
                {(accountPassword || selectedRequest.password) && (accountPassword?.length < 6 && !selectedRequest.password) && (
                  <p className="text-xs text-red-500 mt-1">
                    {translations?.passwordTooShort || 'Password must be at least 6 characters long'}
                  </p>
                )}
              </div>
              
              {/* Show Supervisor Details */}
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <User className="h-4 w-4 text-purple-600 mr-2" />
                  Supervisor Details
                </h4>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {translations?.supervisorEmail || 'Supervisor Email'}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedRequest?.supervisorEmail || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {translations?.supervisorPassword || 'Supervisor Password'}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedRequest?.supervisorPassword || ''}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                
                <div className="text-xs text-gray-500 mb-2">
                  {translations?.supervisorDetailsExplanation || 'The supervisor will use these credentials after verification to access the company account.'}
                </div>
                
                <div className="flex mt-2">
                  <div className={`px-2 py-1 rounded text-xs ${
                    selectedRequest?.supervisorEmailVerified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  } flex items-center`}>
                    {selectedRequest?.supervisorEmailVerified
                      ? <><CheckCircle className="h-3 w-3 mr-1" /> Verified</>
                      : <><XCircle className="h-3 w-3 mr-1" /> Pending Verification</>
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
              <button
                onClick={handleCreateAccount}
                disabled={actionLoading === selectedRequest.id}
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