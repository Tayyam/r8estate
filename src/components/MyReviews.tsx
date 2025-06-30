import React, { useState, useEffect } from 'react';
import { ArrowLeft, Star, Edit, Trash2, AlertCircle, Building2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs, startAfter, doc, deleteDoc, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { Review } from '../types/property';
import EditReviewModal from './CompanyProfile/EditReviewModal';

interface MyReviewsProps {
  onNavigate: (page: string) => void;
}

interface ReviewWithCompany extends Review {
  companyName: string;
  companyLogo?: string;
}

const REVIEWS_PER_PAGE = 10;

const MyReviews: React.FC<MyReviewsProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const { showSuccessToast, showErrorToast, showWarningModal } = useNotification();

  const [reviews, setReviews] = useState<ReviewWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentData | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReview, setSelectedReview] = useState<ReviewWithCompany | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  // Load user reviews with company info and pagination
  const loadReviews = async (loadMore = false) => {
    if (!currentUser) return;
    
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      // Create the base query for user reviews
      let reviewsQuery = query(
        collection(db, 'reviews'),
        where('userId', '==', currentUser.uid),
        orderBy('createdAt', 'desc'),
        limit(REVIEWS_PER_PAGE)
      );

      // If loading more, start after the last document
      if (loadMore && lastDoc) {
        reviewsQuery = query(
          collection(db, 'reviews'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(REVIEWS_PER_PAGE)
        );
      }

      // Get the reviews
      const reviewsSnapshot = await getDocs(reviewsQuery);
      
      // Get total count (only on first load)
      if (!loadMore) {
        const countQuery = query(
          collection(db, 'reviews'),
          where('userId', '==', currentUser.uid)
        );
        const countSnapshot = await getDocs(countQuery);
        setTotalCount(countSnapshot.size);
      }

      // Set the last document for pagination
      const lastVisible = reviewsSnapshot.docs[reviewsSnapshot.docs.length - 1];
      setLastDoc(lastVisible);
      
      // Check if there might be more reviews
      setHasMore(reviewsSnapshot.docs.length === REVIEWS_PER_PAGE);

      // Transform the reviews data
      const reviewsData = await Promise.all(
        reviewsSnapshot.docs.map(async (doc) => {
          const reviewData = {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            companyReply: doc.data().companyReply ? {
              ...doc.data().companyReply,
              repliedAt: doc.data().companyReply.repliedAt?.toDate() || new Date()
            } : undefined
          } as Review;

          // Get company information
          try {
            const companyDoc = await db.doc(`companies/${reviewData.companyId}`).get();
            if (companyDoc.exists) {
              const companyData = companyDoc.data();
              return {
                ...reviewData,
                companyName: companyData?.name || 'Unknown Company',
                companyLogo: companyData?.logoUrl
              } as ReviewWithCompany;
            }
          } catch (error) {
            console.error('Error fetching company data:', error);
          }

          // Fallback if company not found
          return {
            ...reviewData,
            companyName: 'Unknown Company'
          } as ReviewWithCompany;
        })
      );

      // Update the reviews state
      if (loadMore) {
        setReviews(prevReviews => [...prevReviews, ...reviewsData]);
        setCurrentPage(prevPage => prevPage + 1);
      } else {
        setReviews(reviewsData);
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      showErrorToast(
        translations?.errorLoadingReviews || 'Error Loading Reviews',
        translations?.failedToLoadReviews || 'Failed to load your reviews. Please try again.'
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load reviews when component mounts
  useEffect(() => {
    if (currentUser) {
      loadReviews();
    }
  }, [currentUser]);

  // Handle delete review
  const handleDeleteReview = (review: ReviewWithCompany) => {
    showWarningModal(
      translations?.deleteReview || 'Delete Review',
      translations?.confirmDeleteReview || 'Are you sure you want to delete this review? This action cannot be undone.',
      async () => {
        try {
          await deleteDoc(doc(db, 'reviews', review.id));
          
          // Update company's total rating and reviews count
          // This would typically be handled by a cloud function or server-side code
          // For now, let's just update the UI
          
          showSuccessToast(
            translations?.reviewDeleted || 'Review Deleted',
            translations?.reviewDeletedSuccess || 'Your review has been successfully deleted.'
          );
          
          // Reload the reviews
          loadReviews();
        } catch (error) {
          console.error('Error deleting review:', error);
          showErrorToast(
            translations?.error || 'Error',
            translations?.failedToDeleteReview || 'Failed to delete review. Please try again.'
          );
        }
      }
    );
  };

  // Handle edit review
  const handleEditReview = (review: ReviewWithCompany) => {
    setSelectedReview(review);
    setShowEditModal(true);
  };

  // Handle successful edit
  const handleEditSuccess = () => {
    showSuccessToast(
      translations?.reviewUpdated || 'Review Updated',
      translations?.reviewUpdatedSuccess || 'Your review has been successfully updated.'
    );
    setShowEditModal(false);
    setSelectedReview(null);
    loadReviews();
  };

  // Handle toggling reply visibility
  const toggleReply = (reviewId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReplies(newExpanded);
  };

  // Handle navigating to company profile
  const navigateToCompanyProfile = (companyId: string) => {
    // Dispatch event to navigate to company profile (same pattern as in App.tsx)
    const event = new CustomEvent('navigateToCompanyProfile', {
      detail: { companyId }
    });
    window.dispatchEvent(event);
  };

  // If not logged in or user is a company account
  if (!currentUser || currentUser.role === 'company') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">
            {translations?.accessDenied || 'Access Denied'}
          </h2>
          <p className="text-gray-600 mb-6">
            {translations?.myReviewsAccessDenied || 'This page is only available for regular users and administrators.'}
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            {translations?.goToHome || 'Go to Home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4 rtl:space-x-reverse mb-6">
            <button
              onClick={() => onNavigate('personal-profile')}
              className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-800 transition-colors duration-200 rounded-lg hover:bg-gray-100 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>{translations?.backToProfile || 'Back to Profile'}</span>
            </button>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#194866' }}>
              {translations?.myReviews || 'My Reviews'}
            </h1>
            <p className="text-lg text-gray-600">
              {translations?.myReviewsSubtitle || 'Manage all the reviews you have posted across different companies'}
            </p>
          </div>
        </div>
      </section>

      {/* Reviews List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Reviews Count and Pagination Info */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-center">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-xl font-semibold text-gray-900">
              {translations?.yourReviews || 'Your Reviews'}
            </h2>
            <p className="text-gray-600 text-sm">
              {totalCount === 0 
                ? (translations?.noReviewsYet || "You haven't posted any reviews yet")
                : translations?.showingReviewsCount?.replace('{showing}', Math.min(reviews.length, REVIEWS_PER_PAGE * currentPage).toString())
                                                    .replace('{total}', totalCount.toString()) 
                  || `Showing ${Math.min(reviews.length, REVIEWS_PER_PAGE * currentPage)} of ${totalCount} reviews`
              }
            </p>
          </div>

          {/* Pagination Controls (if needed) */}
          {totalCount > REVIEWS_PER_PAGE && (
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <button
                onClick={() => {
                  if (currentPage > 1) {
                    // This is a simplified approach - for real pagination with previous pages,
                    // we'd need to store previous page documents or use a different approach
                    loadReviews();
                  }
                }}
                disabled={currentPage === 1 || loading}
                className="p-2 rounded-md border border-gray-300 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title={translations?.previousPage || 'Previous Page'}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-gray-700 px-3 py-1 rounded-md bg-gray-100">
                {currentPage}
              </span>
              <button
                onClick={() => loadReviews(true)}
                disabled={!hasMore || loadingMore}
                className="p-2 rounded-md border border-gray-300 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                title={translations?.nextPage || 'Next Page'}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-6">
            {reviews.map(review => (
              <div
                key={review.id}
                className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300"
              >
                {/* Company Info & Review Date */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center border border-gray-200 bg-white overflow-hidden cursor-pointer"
                      onClick={() => navigateToCompanyProfile(review.companyId)}
                    >
                      {review.companyLogo ? (
                        <img
                          src={review.companyLogo}
                          alt={review.companyName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 
                        className="font-semibold text-lg text-gray-900 hover:text-blue-600 cursor-pointer"
                        onClick={() => navigateToCompanyProfile(review.companyId)}
                      >
                        {review.companyName}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 space-x-2 rtl:space-x-reverse">
                        <Calendar className="h-4 w-4" />
                        <span>{review.createdAt.toLocaleDateString()}</span>
                        {review.updatedAt > review.createdAt && (
                          <span className="text-xs italic">
                            ({translations?.edited || 'edited'})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Rating */}
                  <div className="flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < review.rating
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Review Content */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-3">{review.title}</h4>
                  <p className="text-gray-700 leading-relaxed mb-4">{review.content}</p>
                </div>
                
                {/* Company Reply (if any) */}
                {review.companyReply && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div 
                      className="bg-blue-50 rounded-xl p-4 border-l-4 border-blue-300 cursor-pointer"
                      onClick={() => toggleReply(review.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          <span className="font-medium text-blue-700">
                            {translations?.companyReply || 'Company Reply'}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({review.companyReply.repliedAt.toLocaleDateString()})
                          </span>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-blue-500 transform transition-transform duration-200 ${
                          expandedReplies.has(review.id) ? 'rotate-90' : ''
                        }`} />
                      </div>
                      
                      <div className={`mt-2 ${expandedReplies.has(review.id) ? 'block' : 'hidden'}`}>
                        <p className="text-gray-700">{review.companyReply.content}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex justify-end space-x-3 rtl:space-x-reverse mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleEditReview(review)}
                    className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors duration-200"
                  >
                    <Edit className="h-4 w-4" />
                    <span>{translations?.edit || 'Edit'}</span>
                  </button>
                  
                  <button
                    onClick={() => handleDeleteReview(review)}
                    className="flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{translations?.delete || 'Delete'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Star className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {translations?.noReviewsPosted || "You haven't posted any reviews yet"}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {translations?.reviewCompaniesPrompt || 'Start sharing your experiences by reviewing real estate companies you have interacted with.'}
            </p>
            <button
              onClick={() => onNavigate('categories')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors duration-200"
            >
              {translations?.browseCompanies || 'Browse Companies'}
            </button>
          </div>
        )}
        
        {/* Load More Button */}
        {hasMore && reviews.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => loadReviews(true)}
              disabled={loadingMore}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors duration-200 disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                  {translations?.loadingMore || 'Loading more...'}
                </>
              ) : (
                translations?.loadMoreReviews || 'Load More Reviews'
              )}
            </button>
          </div>
        )}
        
        {/* No more reviews indicator */}
        {!hasMore && reviews.length > 0 && (
          <div className="mt-8 text-center text-gray-500 text-sm">
            {translations?.noMoreReviews || 'No more reviews to load'}
          </div>
        )}
      </div>
      
      {/* Edit Review Modal */}
      {showEditModal && selectedReview && (
        <EditReviewModal
          review={selectedReview}
          onClose={() => {
            setShowEditModal(false);
            setSelectedReview(null);
          }}
          onSuccess={handleEditSuccess}
          onError={(message) => {
            showErrorToast(
              translations?.error || 'Error',
              message
            );
          }}
        />
      )}
    </div>
  );
};

export default MyReviews;