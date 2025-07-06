import React, { useState, useEffect } from 'react';
import { 
  Flag, Search, Eye, Check, X, AlertCircle, Calendar, 
  ChevronDown, ChevronUp, ArrowLeft, ArrowRight, 
  MessageSquare, ExternalLink, Filter
} from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, getDoc, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Report } from '../../types/report';
import { Review } from '../../types/property';
import { useNavigate } from 'react-router-dom';
import { getCompanySlug } from '../../utils/urlUtils';

// Reports component for admin settings
const Reports: React.FC = () => {
  const { translations } = useLanguage();
  const navigate = useNavigate();
  const [reports, setReports] = useState<(Report & { contentPreview?: string, companyId?: string, companyName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<(Report & { contentPreview?: string, companyId?: string, companyName?: string }) | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  // Items per page for pagination
  const ITEMS_PER_PAGE = 10;

  // Load reports from Firestore
  const loadReports = async () => {
    try {
      setLoading(true);
      
      // Create query based on status filter
      let reportsQuery;
      if (statusFilter === 'all') {
        reportsQuery = query(
          collection(db, 'reports'),
          orderBy('createdAt', 'desc')
        );
      } else {
        reportsQuery = query(
          collection(db, 'reports'),
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(reportsQuery);
      const reportsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        resolvedAt: doc.data().resolvedAt?.toDate() || undefined
      })) as Report[];
      
      // Fetch content previews for each report
      const reportsWithPreviews = await Promise.all(
        reportsData.map(async (report) => {
          let contentPreview = '';
          let companyId = '';
          let companyName = '';
          
          try {
            if (report.contentType === 'review') {
              // Fetch review content
              const reviewDoc = await getDoc(doc(db, 'reviews', report.contentId));
              if (reviewDoc.exists()) {
                const reviewData = reviewDoc.data();
                contentPreview = reviewData.title || reviewData.content.substring(0, 100);
                companyId = reviewData.companyId;
                
                // Fetch company name
                const companyDoc = await getDoc(doc(db, 'companies', companyId));
                if (companyDoc.exists()) {
                  companyName = companyDoc.data().name;
                }
              }
            } else if (report.contentType === 'reply') {
              // Fetch reply content (which is part of a review)
              const reviewDoc = await getDoc(doc(db, 'reviews', report.contentId));
              if (reviewDoc.exists() && reviewDoc.data().companyReply) {
                const reviewData = reviewDoc.data();
                contentPreview = reviewData.companyReply.content.substring(0, 100);
                companyId = reviewData.companyId;
                
                // Fetch company name
                const companyDoc = await getDoc(doc(db, 'companies', companyId));
                if (companyDoc.exists()) {
                  companyName = companyDoc.data().name;
                }
              }
            }
          } catch (error) {
            console.error('Error fetching content preview:', error);
            contentPreview = 'Content not available';
          }
          
          return {
            ...report,
            contentPreview: contentPreview + (contentPreview.length >= 100 ? '...' : ''),
            companyId,
            companyName
          };
        })
      );
      
      setReports(reportsWithPreviews);
    } catch (err) {
      console.error('Error loading reports:', err);
      setError(translations?.failedToLoadReports || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  // Load reports on component mount and when status filter changes
  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  // Filter reports based on search query
  const filteredReports = reports.filter(report => {
    const searchLower = searchQuery.toLowerCase();
    return (
      report.reporterName?.toLowerCase().includes(searchLower) ||
      report.reporterEmail?.toLowerCase().includes(searchLower) ||
      report.contentPreview?.toLowerCase().includes(searchLower) ||
      report.companyName?.toLowerCase().includes(searchLower) ||
      report.reason?.toLowerCase().includes(searchLower) ||
      report.details?.toLowerCase().includes(searchLower)
    );
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Toggle report details expansion
  const toggleExpand = (reportId: string) => {
    if (expandedReportId === reportId) {
      setExpandedReportId(null);
    } else {
      setExpandedReportId(reportId);
    }
  };

  // Navigate to reported content
  const navigateToContent = (report: Report & { companyId?: string, companyName?: string }) => {
    if (!report.companyId || !report.companyName) return;
    
    const companySlug = getCompanySlug(report.companyName);
    navigate(`/company/${companySlug}/${report.companyId}/reviews`);
  };

  // Handle accept report (delete content)
  const handleAcceptReport = async () => {
    if (!selectedReport) return;

    try {
      setActionLoading(selectedReport.id);
      
      if (selectedReport.contentType === 'review') {
        // Delete the review
        await deleteDoc(doc(db, 'reviews', selectedReport.contentId));
      } else if (selectedReport.contentType === 'reply') {
        // Remove the reply from the review
        const reviewRef = doc(db, 'reviews', selectedReport.contentId);
        const reviewDoc = await getDoc(reviewRef);
        
        if (reviewDoc.exists()) {
          await updateDoc(reviewRef, {
            companyReply: null,
            updatedAt: new Date()
          });
        }
      }
      
      // Update report status
      await updateDoc(doc(db, 'reports', selectedReport.id), {
        status: 'accepted',
        resolvedBy: 'admin', // This should be the actual admin ID
        resolvedAt: new Date(),
        notes: adminNotes,
        updatedAt: new Date()
      });
      
      setSuccess(translations?.reportAcceptedSuccess || 'Report accepted and content removed successfully');
      setTimeout(() => setSuccess(''), 5000);
      
      // Update local state
      setReports(prev => prev.map(report => 
        report.id === selectedReport.id 
          ? { ...report, status: 'accepted', resolvedAt: new Date(), notes: adminNotes } 
          : report
      ));
      
      setShowAcceptModal(false);
      setSelectedReport(null);
      setAdminNotes('');
      
    } catch (error) {
      console.error('Error accepting report:', error);
      setError(translations?.failedToAcceptReport || 'Failed to accept report');
      setTimeout(() => setError(''), 5000);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reject report
  const handleRejectReport = async () => {
    if (!selectedReport) return;

    try {
      setActionLoading(selectedReport.id);
      
      // Update report status
      await updateDoc(doc(db, 'reports', selectedReport.id), {
        status: 'rejected',
        resolvedBy: 'admin', // This should be the actual admin ID
        resolvedAt: new Date(),
        notes: adminNotes,
        updatedAt: new Date()
      });
      
      setSuccess(translations?.reportRejectedSuccess || 'Report rejected successfully');
      setTimeout(() => setSuccess(''), 5000);
      
      // Update local state
      setReports(prev => prev.map(report => 
        report.id === selectedReport.id 
          ? { ...report, status: 'rejected', resolvedAt: new Date(), notes: adminNotes } 
          : report
      ));
      
      setShowRejectModal(false);
      setSelectedReport(null);
      setAdminNotes('');
      
    } catch (error) {
      console.error('Error rejecting report:', error);
      setError(translations?.failedToRejectReport || 'Failed to reject report');
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
      case 'accepted':
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
      case 'accepted':
        return translations?.accepted || 'Accepted';
      case 'rejected':
        return translations?.rejected || 'Rejected';
      default:
        return status;
    }
  };

  // Get reason translation
  const getReasonTranslation = (reason: string) => {
    switch(reason) {
      case 'spam':
        return translations?.reportReasonSpam || 'Spam';
      case 'inappropriate':
        return translations?.reportReasonInappropriate || 'Inappropriate Content';
      case 'fake':
        return translations?.reportReasonFake || 'Fake Review';
      case 'offensive':
        return translations?.reportReasonOffensive || 'Offensive Content';
      case 'other':
        return translations?.reportReasonOther || 'Other';
      default:
        return reason;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Section Header */}
      <div className="px-4 sm:px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <Flag className="h-6 w-6" style={{ color: '#194866' }} />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#194866' }}>
                {translations?.reportManagement || 'Report Management'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? (
                  translations?.loadingReports || 'Loading reports...'
                ) : (
                  translations?.totalReports?.replace('{count}', reports.length.toString()) || 
                  `Total reports: ${reports.length}`
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
              placeholder={translations?.searchReports || 'Search reports...'}
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
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'accepted' | 'rejected')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
              style={{ 
                focusBorderColor: '#194866',
                focusRingColor: '#194866'
              }}
            >
              <option value="all">{translations?.allReports || 'All Reports'}</option>
              <option value="pending">{translations?.pendingReports || 'Pending'}</option>
              <option value="accepted">{translations?.acceptedReports || 'Accepted'}</option>
              <option value="rejected">{translations?.rejectedReports || 'Rejected'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <Flag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery 
                ? translations?.noReportsFound || 'No reports found matching your search' 
                : statusFilter !== 'all'
                  ? translations?.noReportsWithStatus?.replace('{status}', getStatusTranslation(statusFilter).toLowerCase()) || `No ${statusFilter} reports found`
                  : translations?.noReports || 'No reports yet'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedReports.map(report => (
              <div 
                key={report.id} 
                className={`bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 ${
                  report.status === 'pending' ? 'border-l-4 border-l-yellow-400' : 
                  report.status === 'accepted' ? 'border-l-4 border-l-green-400' : 
                  'border-l-4 border-l-red-400'
                }`}
              >
                {/* Report Header */}
                <div 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 bg-gray-50 cursor-pointer"
                  onClick={() => toggleExpand(report.id)}
                >
                  <div className="flex items-center space-x-3 rtl:space-x-reverse mb-3 sm:mb-0">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Flag className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                        {report.reporterName || report.reporterEmail}
                      </h3>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{report.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(report.status)}`}>
                      {getStatusTranslation(report.status)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(report.id);
                      }}
                      className="p-1.5 hover:bg-gray-200 rounded-full"
                    >
                      {expandedReportId === report.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Report Details (Expanded) */}
                {expandedReportId === report.id && (
                  <div className="p-4 sm:p-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* Report Information */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900 mb-2">
                          {translations?.reportInformation || 'Report Information'}
                        </h4>
                        <div className="flex items-start space-x-2 rtl:space-x-reverse text-sm">
                          <span className="text-gray-500 min-w-24">{translations?.reportType || 'Content Type'}:</span>
                          <span className="text-gray-700 capitalize">
                            {report.contentType === 'review' 
                              ? (translations?.review || 'Review') 
                              : (translations?.companyReply || 'Company Reply')}
                          </span>
                        </div>
                        <div className="flex items-start space-x-2 rtl:space-x-reverse text-sm">
                          <span className="text-gray-500 min-w-24">{translations?.reportReason || 'Reason'}:</span>
                          <span className="text-gray-700">{getReasonTranslation(report.reason)}</span>
                        </div>
                        <div className="flex items-start space-x-2 rtl:space-x-reverse text-sm">
                          <span className="text-gray-500 min-w-24">{translations?.company || 'Company'}:</span>
                          <span className="text-gray-700">{report.companyName || 'Unknown'}</span>
                        </div>
                        <div className="flex items-start space-x-2 rtl:space-x-reverse text-sm">
                          <span className="text-gray-500 min-w-24">{translations?.reportDate || 'Report Date'}:</span>
                          <span className="text-gray-700">{report.createdAt.toLocaleString()}</span>
                        </div>
                        {report.resolvedAt && (
                          <div className="flex items-start space-x-2 rtl:space-x-reverse text-sm">
                            <span className="text-gray-500 min-w-24">{translations?.resolvedDate || 'Resolved Date'}:</span>
                            <span className="text-gray-700">{report.resolvedAt.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Reported Content */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900 mb-2">
                          {translations?.reportedContent || 'Reported Content'}
                        </h4>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <p className="text-gray-700 text-sm">
                            {report.contentPreview || (translations?.contentNotAvailable || 'Content not available')}
                          </p>
                        </div>
                        
                        {report.details && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mt-4 mb-1">
                              {translations?.reporterComments || 'Reporter Comments'}:
                            </h5>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <p className="text-gray-700 text-sm italic">"{report.details}"</p>
                            </div>
                          </div>
                        )}
                        
                        {report.notes && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mt-4 mb-1">
                              {translations?.adminNotes || 'Admin Notes'}:
                            </h5>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <p className="text-gray-700 text-sm">{report.notes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-gray-100">
                      <button
                        onClick={() => navigateToContent(report)}
                        disabled={!report.companyId || !report.companyName}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-1 rtl:space-x-reverse disabled:opacity-50"
                      >
                        <Eye className="h-4 w-4" />
                        <span>{translations?.viewContent || 'View Content'}</span>
                      </button>
                      
                      {report.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setShowAcceptModal(true);
                            }}
                            disabled={actionLoading === report.id}
                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors duration-200 flex items-center space-x-1 rtl:space-x-reverse"
                          >
                            <Check className="h-4 w-4" />
                            <span>{translations?.acceptReport || 'Accept Report'}</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReport(report);
                              setShowRejectModal(true);
                            }}
                            disabled={actionLoading === report.id}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors duration-200 flex items-center space-x-1 rtl:space-x-reverse"
                          >
                            <X className="h-4 w-4" />
                            <span>{translations?.rejectReport || 'Reject Report'}</span>
                          </button>
                        </>
                      )}
                    </div>
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

      {/* Accept Report Modal */}
      {showAcceptModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {translations?.acceptReportTitle || 'Accept Report'}
              </h3>
              <p className="text-gray-600 mb-6">
                {translations?.acceptReportConfirmation || 
                 `Are you sure you want to accept this report? This will remove the reported ${selectedReport.contentType === 'review' ? 'review' : 'reply'} from the platform.`}
              </p>
              
              {/* Admin Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  {translations?.adminNotes || 'Admin Notes'} ({translations?.optional || 'optional'})
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 h-20"
                  placeholder={translations?.enterNotesForReport || 'Enter any notes about this report...'}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
                <button
                  onClick={handleAcceptReport}
                  disabled={actionLoading === selectedReport.id}
                  className="w-full sm:w-auto flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  {actionLoading === selectedReport.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  <span>{translations?.acceptAndRemove || 'Accept & Remove Content'}</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowAcceptModal(false);
                    setSelectedReport(null);
                    setAdminNotes('');
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

      {/* Reject Report Modal */}
      {showRejectModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {translations?.rejectReportTitle || 'Reject Report'}
              </h3>
              <p className="text-gray-600 mb-6">
                {translations?.rejectReportConfirmation || 
                 'Are you sure you want to reject this report? The reported content will remain on the platform.'}
              </p>
              
              {/* Admin Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  {translations?.adminNotes || 'Admin Notes'} ({translations?.optional || 'optional'})
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 h-20"
                  placeholder={translations?.enterNotesForReport || 'Enter any notes about this report...'}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
                <button
                  onClick={handleRejectReport}
                  disabled={actionLoading === selectedReport.id}
                  className="w-full sm:w-auto flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
                >
                  {actionLoading === selectedReport.id ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <X className="h-4 w-4 mr-1" />
                  )}
                  <span>{translations?.rejectReport || 'Reject Report'}</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedReport(null);
                    setAdminNotes('');
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
    </div>
  );
};

export default Reports;