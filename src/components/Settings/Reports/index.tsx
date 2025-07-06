import React, { useState, useEffect } from 'react';
import { Flag, Search, Check, X, Eye, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, getDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Report, ReportReason, ReportStatus } from '../../../types/reports';

const Reports: React.FC = () => {
  const { translations } = useLanguage();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Load reports from Firestore
  const loadReports = async () => {
    try {
      setLoading(true);
      
      let reportsQuery = query(
        collection(db, 'reports'),
        orderBy('createdAt', sortOrder)
      );
      
      // Apply status filter if not 'all'
      if (statusFilter !== 'all') {
        reportsQuery = query(
          collection(db, 'reports'),
          where('status', '==', statusFilter),
          orderBy('createdAt', sortOrder)
        );
      }
      
      const reportsSnapshot = await getDocs(reportsQuery);
      const reportsData = reportsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Report[];
      
      setReports(reportsData);
    } catch (error) {
      console.error('Error loading reports:', error);
      setError(translations?.failedToLoadReports || 'Failed to load reports');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Load reports on mount and when filters change
  useEffect(() => {
    loadReports();
  }, [statusFilter, sortOrder]);

  // Filter reports based on search query
  const filteredReports = reports.filter(report => {
    const searchLower = searchQuery.toLowerCase();
    return (
      report.reporterName.toLowerCase().includes(searchLower) ||
      report.reason.toLowerCase().includes(searchLower) ||
      (report.details && report.details.toLowerCase().includes(searchLower))
    );
  });

  // Accept report (delete the reported content)
  const handleAcceptReport = async (report: Report) => {
    try {
      setActionLoading(report.id);
      
      // Update report status
      const reportRef = doc(db, 'reports', report.id);
      await updateDoc(reportRef, {
        status: 'accepted',
        updatedAt: new Date()
      });
      
      // For a review, delete the review
      if (report.contentType === 'review') {
        try {
          const reviewRef = doc(db, 'reviews', report.contentId);
          
          // Get the review to update company's rating after deletion
          const reviewDoc = await getDoc(reviewRef);
          if (reviewDoc.exists()) {
            // Delete the review
            await deleteDoc(reviewRef);
            
            // Update company's total reviews and rating
            const reviewData = reviewDoc.data();
            const companyRef = doc(db, 'companies', report.companyId);
            const companyDoc = await getDoc(companyRef);
            
            if (companyDoc.exists()) {
              const companyData = companyDoc.data();
              const totalReviews = (companyData.totalReviews || 0) - 1;
              
              // Recalculate total rating
              let newTotalRating = 0;
              if (totalReviews > 0) {
                // Get all remaining reviews for this company
                const remainingReviewsQuery = query(
                  collection(db, 'reviews'),
                  where('companyId', '==', report.companyId)
                );
                const remainingReviewsSnapshot = await getDocs(remainingReviewsQuery);
                const totalRating = remainingReviewsSnapshot.docs.reduce(
                  (sum, doc) => sum + doc.data().rating, 0
                );
                newTotalRating = totalReviews > 0 ? totalRating / totalReviews : 0;
              }
              
              // Update company
              await updateDoc(companyRef, {
                totalReviews: totalReviews,
                totalRating: newTotalRating,
                rating: newTotalRating,
                updatedAt: new Date()
              });
            }
          }
        } catch (error) {
          console.error('Error deleting review:', error);
          throw error;
        }
      }
      
      // For a reply, remove the companyReply field from the review
      if (report.contentType === 'reply') {
        try {
          const reviewRef = doc(db, 'reviews', report.contentId);
          await updateDoc(reviewRef, {
            companyReply: null,
            updatedAt: new Date()
          });
        } catch (error) {
          console.error('Error removing company reply:', error);
          throw error;
        }
      }
      
      // Update local state
      setReports(prev => 
        prev.map(r => r.id === report.id ? {...r, status: 'accepted', updatedAt: new Date()} : r)
      );
      
      setSuccess(translations?.reportAcceptedSuccess || 'Report accepted and content removed');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error accepting report:', error);
      setError(translations?.failedToAcceptReport || 'Failed to accept report');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  // Deny report (keep the content)
  const handleDenyReport = async (report: Report) => {
    try {
      setActionLoading(report.id);
      
      // Update report status
      const reportRef = doc(db, 'reports', report.id);
      await updateDoc(reportRef, {
        status: 'denied',
        updatedAt: new Date()
      });
      
      // Update local state
      setReports(prev => 
        prev.map(r => r.id === report.id ? {...r, status: 'denied', updatedAt: new Date()} : r)
      );
      
      setSuccess(translations?.reportDeniedSuccess || 'Report denied');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (error) {
      console.error('Error denying report:', error);
      setError(translations?.failedToDenyReport || 'Failed to deny report');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(null);
    }
  };

  // View reported content
  const handleViewReportedContent = (report: Report) => {
    // Navigate to company profile and scroll to the review
    if (report.companyId) {
      const companyURL = `/company/${report.companyId}/reviews?highlight=${report.contentId}`;
      window.open(companyURL, '_blank');
    }
  };

  // Get translated report reason
  const getReportReasonTranslation = (reason: ReportReason) => {
    switch (reason) {
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

  // Get status badge styling
  const getStatusBadgeStyle = (status: ReportStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
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
                {translations?.reportsManagement || 'Reports Management'}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
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

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | ReportStatus)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
              style={{ 
                focusBorderColor: '#194866',
                focusRingColor: '#194866'
              }}
            >
              <option value="all">{translations?.allStatuses || 'All Statuses'}</option>
              <option value="pending">{translations?.pending || 'Pending'}</option>
              <option value="accepted">{translations?.accepted || 'Accepted'}</option>
              <option value="denied">{translations?.denied || 'Denied'}</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <button
              onClick={toggleSortOrder}
              className="w-full flex items-center justify-center space-x-2 rtl:space-x-reverse px-4 py-2 border border-gray-300 rounded-lg text-gray-700 transition-colors duration-200 hover:bg-gray-50"
            >
              <span>{translations?.sortByDate || 'Sort by Date'}</span>
              {sortOrder === 'desc' ? (
                <ArrowDown className="h-4 w-4" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
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
              {searchQuery || statusFilter !== 'all'
                ? translations?.noReportsFound || 'No reports found'
                : translations?.noReportsYet || 'No reports yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.reporter || 'Reporter'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.content || 'Content'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.reason || 'Reason'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.status || 'Status'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.date || 'Date'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {translations?.actions || 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{report.reporterName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {report.contentType === 'review' 
                          ? (translations?.review || 'Review')
                          : (translations?.companyReply || 'Company Reply')}
                      </div>
                      <div className="text-xs text-gray-500">{report.contentId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getReportReasonTranslation(report.reason)}
                      </div>
                      {report.details && (
                        <div className="text-xs text-gray-500 truncate max-w-xs" title={report.details}>
                          {report.details.length > 30 ? `${report.details.substring(0, 30)}...` : report.details}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeStyle(report.status)}`}>
                        {translations?.[report.status] || report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {report.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
                        <button
                          onClick={() => handleViewReportedContent(report)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                          title={translations?.view || 'View'}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {report.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAcceptReport(report)}
                              disabled={actionLoading === report.id}
                              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
                              title={translations?.accept || 'Accept'}
                            >
                              {actionLoading === report.id ? (
                                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </button>
                            
                            <button
                              onClick={() => handleDenyReport(report)}
                              disabled={actionLoading === report.id}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
                              title={translations?.deny || 'Deny'}
                            >
                              {actionLoading === report.id ? (
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;