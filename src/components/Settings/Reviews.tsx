import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Search, Eye, EyeOff, Trash2, CheckCircle, XCircle, 
  AlertTriangle, ChevronDown, X, Tag, Filter, Calendar, Star, User
} from 'lucide-react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Review } from '../../types/property';
import { useNavigate } from 'react-router-dom';
import { getCompanySlug } from '../../utils/urlUtils';

const Reviews: React.FC = () => {
  const { translations, language } = useLanguage();
  const navigate = useNavigate();
  
  const [reviews, setReviews] = useState<(Review & { companyName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationDropdowns, setVerificationDropdowns] = useState<Record<string, boolean>>({});
  const [updatingVerification, setUpdatingVerification] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'hidden' | 'published'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load reviews
  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        
        // Create query
        const reviewsQuery = query(
          collection(db, 'reviews'),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(reviewsQuery);
        const reviewsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          companyReply: doc.data().companyReply ? {
            ...doc.data().companyReply,
            repliedAt: doc.data().companyReply.repliedAt?.toDate() || new Date()
          } : undefined
        })) as Review[];
        
        // Fetch company names for each review
        const reviewsWithCompanies = await Promise.all(
          reviewsData.map(async (review) => {
            try {
              const companyDoc = await getDoc(doc(db, 'companies', review.companyId));
              return {
                ...review,
                companyName: companyDoc.exists() ? companyDoc.data().name : 'Unknown Company'
              };
            } catch (error) {
              console.error(`Error fetching company for review ${review.id}:`, error);
              return {
                ...review,
                companyName: 'Unknown Company'
              };
            }
          })
        );
        
        setReviews(reviewsWithCompanies);
      } catch (error) {
        console.error('Error loading reviews:', error);
        setError(translations?.failedToLoadReviews || 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };
    
    loadReviews();
  }, []);

  // Filter reviews
  const filteredReviews = reviews.filter(review => {
    // Search filter
    const matchesSearch = 
      review.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.companyName?.toLowerCase().includes(searchQuery.toLowerCase());
      
    // Status filter
    const matchesStatus = statusFilter === 'all' || 
                        (statusFilter === 'hidden' && review.hidden) || 
                        (statusFilter === 'published' && !review.hidden);
                        
    // Verification filter
    const matchesVerification = 
      verificationFilter === 'all' ||
      (verificationFilter === 'verified' && review.verified) ||
      (verificationFilter === 'unverified' && !review.verified);
      
    return matchesSearch && matchesStatus && matchesVerification;
  });

  // Pagination
  const totalPages = Math.ceil(filteredReviews.length / itemsPerPage);
  const paginatedReviews = filteredReviews.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Render stars for rating
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            className={`h-4 w-4 ${index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">{rating}</span>
      </div>
    );
  };

  // Get status badge
  const getStatusBadge = (hidden?: boolean) => {
    if (hidden) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          {translations?.hidden || 'Hidden'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        {translations?.published || 'Published'}
      </span>
    );
  };

  // Toggle verification dropdown
  const toggleVerificationDropdown = (reviewId: string) => {
    setVerificationDropdowns(prev => ({
      ...prev,
      [reviewId]: !prev[reviewId]
    }));
  };

  // Handle verification tag update
  const handleVerificationTagUpdate = async (reviewId: string, verified: boolean) => {
    try {
      setUpdatingVerification(reviewId);
      
      // Update review in Firestore
      const reviewRef = doc(db, 'reviews', reviewId);
      await updateDoc(reviewRef, {
        verified,
        updatedAt: new Date()
      });
      
      // Update local state
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, verified }
          : review
      ));
      
      setSuccess(verified 
        ? (translations?.reviewMarkedVerified || 'Review marked as verified') 
        : (translations?.reviewMarkedUnverified || 'Review marked as unverified'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating verification tag:', error);
      setError(translations?.failedToUpdateVerification || 'Failed to update verification');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUpdatingVerification(null);
    }
  };

  // Handle review actions (hide, unhide, delete)
  const handleReviewAction = async (reviewId: string, action: 'hide' | 'unhide' | 'delete') => {
    try {
      const reviewRef = doc(db, 'reviews', reviewId);
      
      if (action === 'delete') {
        // Confirm before deleting
        if (!confirm(translations?.confirmDeleteReview || 'Are you sure you want to delete this review?')) {
          return;
        }
        
        // Delete review
        await deleteDoc(reviewRef);
        
        // Remove from local state
        setReviews(prev => prev.filter(review => review.id !== reviewId));
        
        setSuccess(translations?.reviewDeletedSuccess || 'Review deleted successfully');
      } else {
        // Hide or unhide review
        await updateDoc(reviewRef, {
          hidden: action === 'hide',
          updatedAt: new Date()
        });
        
        // Update local state
        setReviews(prev => prev.map(review => 
          review.id === reviewId 
            ? { ...review, hidden: action === 'hide' } 
            : review
        ));
        
        setSuccess(action === 'hide' 
          ? (translations?.reviewHiddenSuccess || 'Review hidden successfully') 
          : (translations?.reviewUnhiddenSuccess || 'Review unhidden successfully'));
      }
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error(`Error ${action}ing review:`, error);
      setError(translations?.failedToUpdateReview || 'Failed to update review');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Navigate to company profile
  const navigateToCompany = (companyId: string, companyName: string) => {
    const companySlug = getCompanySlug(companyName);
    navigate(`/company/${companySlug}/${companyId}/reviews`);
  };

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setVerificationFilter('all');
    setCurrentPage(1);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Section Header */}
      <div className="px-4 sm:px-8 py-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <MessageSquare className="h-6 w-6" style={{ color: '#194866' }} />
            <div>
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: '#194866' }}>
                {translations?.reviewManagement || 'Review Management'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {loading ? (
                  translations?.loadingReviews || 'Loading reviews...'
                ) : (
                  translations?.totalReviews?.replace('{count}', reviews.length.toString()) || 
                  `Total reviews: ${reviews.length}`
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="mx-4 sm:mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm sm:text-base">{error}</p>
        </div>
      )}

      {success && (
        <div className="mx-4 sm:mx-8 mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center space-x-3 rtl:space-x-reverse">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700 text-sm sm:text-base">{success}</p>
        </div>
      )}

      {/* Search and Filters */}
      <div className="px-4 sm:px-8 py-4 border-b border-gray-200">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder={translations?.searchReviews || 'Search reviews...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 rtl:pr-10 rtl:pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
            />
          </div>
          
          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | 'hidden' | 'published');
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
            >
              <option value="all">{translations?.allStatuses || 'All Statuses'}</option>
              <option value="published">{translations?.published || 'Published'}</option>
              <option value="hidden">{translations?.hidden || 'Hidden'}</option>
            </select>
          </div>
          
          {/* Verification Filter */}
          <div>
            <select
              value={verificationFilter}
              onChange={(e) => {
                setVerificationFilter(e.target.value as 'all' | 'verified' | 'unverified');
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
            >
              <option value="all">{translations?.allVerifications || 'All Verifications'}</option>
              <option value="verified">{translations?.verified || 'Verified'}</option>
              <option value="unverified">{translations?.unverified || 'Unverified'}</option>
            </select>
          </div>
          
          {/* Reset Filters */}
          <div className="flex items-center">
            <button
              onClick={resetFilters}
              className="flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors duration-200"
              disabled={!searchQuery && statusFilter === 'all' && verificationFilter === 'all'}
            >
              <Filter className="h-4 w-4" />
              <span>{translations?.resetFilters || 'Reset Filters'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : paginatedReviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              {searchQuery || statusFilter !== 'all' || verificationFilter !== 'all'
                ? translations?.noReviewsFound || 'No reviews found with the current filters'
                : translations?.noReviews || 'No reviews yet'
              }
            </p>
            {(searchQuery || statusFilter !== 'all' || verificationFilter !== 'all') && (
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md"
              >
                {translations?.resetFilters || 'Reset Filters'}
              </button>
            )}
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {translations?.author || 'Author'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {translations?.company || 'Company'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {translations?.reviewTitle || 'Review'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {translations?.rating || 'Rating'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {translations?.status || 'Status'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {translations?.verification || 'Verification'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {translations?.createdDate || 'Created'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {translations?.actions || 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedReviews.map(review => (
                <tr key={review.id} className="hover:bg-gray-50">
                  {/* Author */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {review.userName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {review.userEmail}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Company */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-blue-600 cursor-pointer hover:underline"
                         onClick={() => navigateToCompany(review.companyId, review.companyName || '')}>
                      {review.companyName}
                    </div>
                  </td>
                  
                  {/* Review Title/Content */}
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{review.title}</div>
                    <div className="text-sm text-gray-500 max-w-xs truncate">{review.content}</div>
                  </td>
                  
                  {/* Rating */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStars(review.rating)}
                  </td>
                  
                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(review.hidden)}
                  </td>
                  
                  {/* Verification */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      review.verified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {review.verified 
                        ? <><CheckCircle className="h-3 w-3 mr-1" />{translations?.verified || 'Verified'}</>
                        : <><XCircle className="h-3 w-3 mr-1" />{translations?.unverified || 'Unverified'}</>
                      }
                    </span>
                  </td>
                  
                  {/* Created Date */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(review.createdAt)}
                  </td>
                  
                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {/* View Button */}
                      <button
                        onClick={() => navigateToCompany(review.companyId, review.companyName || '')}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title={translations?.viewReview || 'View Review'}
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      
                      {/* Verify/Unverify Button */}
                      <button
                        onClick={() => handleVerificationTagUpdate(review.id, !review.verified)}
                        className={`${
                          review.verified ? 'text-gray-600 hover:text-gray-900' : 'text-green-600 hover:text-green-900'
                        } p-1`}
                        title={review.verified ? (translations?.markAsUnverified || 'Mark as Unverified') : (translations?.markAsVerified || 'Mark as Verified')}
                      >
                        {review.verified ? (
                          <XCircle className="h-5 w-5" />
                        ) : (
                          <CheckCircle className="h-5 w-5" />
                        )}
                      </button>
                      
                      {/* Hide/Unhide Button */}
                      {review.hidden ? (
                        <button
                          onClick={() => handleReviewAction(review.id, 'unhide')}
                          className="text-green-600 hover:text-green-900 p-1"
                          title={translations?.unhideReview || 'Unhide Review'}
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReviewAction(review.id, 'hide')}
                          className="text-yellow-600 hover:text-yellow-900 p-1"
                          title={translations?.hideReview || 'Hide Review'}
                        >
                          <EyeOff className="h-5 w-5" />
                        </button>
                      )}
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleReviewAction(review.id, 'delete')}
                        className="text-red-600 hover:text-red-900 p-1"
                        title={translations?.deleteReview || 'Delete Review'}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredReviews.length > 0 && (
        <div className="px-4 sm:px-8 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              {translations?.previous || 'Previous'}
            </button>
            <button
              onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              {translations?.next || 'Next'}
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {translations?.showing || 'Showing'}{' '}
                <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>{' '}
                {translations?.to || 'to'}{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, filteredReviews.length)}
                </span>{' '}
                {translations?.of || 'of'}{' '}
                <span className="font-medium">{filteredReviews.length}</span>{' '}
                {translations?.results || 'results'}
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">{translations?.previous || 'Previous'}</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {/* Page numbers */}
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === index + 1
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">{translations?.next || 'Next'}</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;