import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Star, MessageSquare, Edit, Trash2, Building2, AlertCircle, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { collection, query, where, orderBy, limit, startAfter, getDocs, deleteDoc, doc, getDoc, updateDoc, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { Review } from '../types/property';
import EditReviewModal from './CompanyProfile/EditReviewModal';

interface MyReviewsProps {
  onNavigate: (page: string) => void;
}

const REVIEWS_PER_PAGE = 10;

const MyReviews: React.FC<MyReviewsProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { translations, language } = useLanguage();
  const { showSuccessToast, showErrorToast, showSuccessModal, showWarningModal } = useNotification();

  // State for reviews and pagination
  const [reviews, setReviews] = useState<(Review & { companyName: string, companyLogo?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentData | null>(null);
  const [totalReviews, setTotalReviews] = useState(0);
  
  // UI states
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Scroll handling
  const reviewsContainerRef = useRef<HTMLDivElement>(null);

  // Check if user is logged in
  useEffect(() => {
    if (!currentUser || currentUser.role === 'company') {
      onNavigate('home');
    }
  }, [currentUser]);

  // Load reviews by user
  const loadReviews = async (loadMore = false) => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Create query for user's reviews
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

      const reviewsSnapshot = await getDocs(reviewsQuery);
      
      // If first load, get total count
      if (!loadMore) {
        const countQuery = query(
          collection(db, 'reviews'),
          where('userId', '==', currentUser.uid)
        );
        const countSnapshot = await getDocs(countQuery);
        setTotalReviews(countSnapshot.size);
      }

      // Extract reviews data
      const reviewsData = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        companyReply: doc.data().companyReply ? {
          ...doc.data().companyReply,
          repliedAt: doc.data().companyReply.repliedAt?.toDate() || new Date()
        } : undefined
      })) as Review[];

      // Get company names for each review
      const reviewsWithCompanyNames = await Promise.all(
        reviewsData.map(async (review) => {
          const companyDoc = await getDoc(doc(db, 'companies', review.companyId));
          
          let companyName = "Unknown Company";
          let companyLogo = undefined;
          
          if (companyDoc.exists()) {
            const companyData = companyDoc.data();
            companyName = companyData?.name || "Unknown Company";
            companyLogo = companyData?.logoUrl || undefined;
          }
          
          return {
            ...review,
            companyName,
            companyLogo
          };
        })
      );

      // Update state with new reviews
      if (loadMore) {
        setReviews(prev => [...prev, ...reviewsWithCompanyNames]);
      } else {
        setReviews(reviewsWithCompanyNames);
      }

      // Update pagination state
      setLastDoc(reviewsSnapshot.docs[reviewsSnapshot.docs.length - 1] || null);
      setHasMore(reviewsSnapshot.docs.length === REVIEWS_PER_PAGE);
      
    } catch (error) {
      console.error('Error loading reviews:', error);
      showErrorToast(
        translations?.errorLoadingReviews || 'Error',
        translations?.failedToLoadReviews || 'Failed to load your reviews'
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (currentUser) {
      loadReviews();
    }
  }, [currentUser]);

  // Handle load more
  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadReviews(true);
    }
  };

  // Toggle reply expansion
  const toggleReplyExpansion = (reviewId: string) => {
    const newExpanded = new Set(expandedReplies);
    if (newExpanded.has(reviewId)) {
      newExpanded.delete(reviewId);
    } else {
      newExpanded.add(reviewId);
    }
    setExpandedReplies(newExpanded);
  };

  // Open edit modal
  const openEditModal = (review: Review) => {
    // Check if review has company reply
    if (review.companyReply) {
      showErrorToast(
        translations?.cannotEditReview || 'Cannot Edit Review',
        translations?.cannotEditAfterReply || 'Reviews that have company replies cannot be edited to maintain conversation integrity.'
      );
      return;
    }
    
    setSelectedReview(review);
    setShowEditModal(true);
  };

  // Handle delete review
  const handleDeleteReview = (review: Review) => {
    // Check if review has company reply
    if (review.companyReply) {
      showErrorToast(
        translations?.cannotDeleteReview || 'Cannot Delete Review',
        translations?.cannotDeleteAfterReply || 'Reviews that have company replies cannot be deleted to maintain conversation integrity.'
      );
      return;
    }
    
    showWarningModal(
      translations?.deleteReview || 'Delete Review',
      translations?.confirmDeleteReview || 'Are you sure you want to delete this review? This action cannot be undone.',
      async () => {
        try {
          setActionLoading(true);
          
          // Delete review from Firestore
          await deleteDoc(doc(db, 'reviews', review.id));
          
          // Update company rating and count
          try {
            // Get all reviews for this company
            const reviewsQuery = query(
              collection(db, 'reviews'),
              where('companyId', '==', review.companyId)
            );
            const reviewsSnapshot = await getDocs(reviewsQuery);
            const allReviews = reviewsSnapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data() 
            }));
            
            const averageRating = allReviews.length > 0 
              ? allReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / allReviews.length 
              : 0;
            
            const roundedRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal place
            
            const companyRef = doc(db, 'companies', review.companyId);
            await updateDoc(companyRef, {
              totalRating: roundedRating,
              rating: roundedRating,
              totalReviews: allReviews.length,
              updatedAt: new Date()
            });
          } catch (error) {
            console.error('Error updating company rating:', error);
            // Continue with review deletion even if company update fails
          }
          
          // Remove review from local state
          setReviews(prevReviews => prevReviews.filter(r => r.id !== review.id));
          setTotalReviews(prev => prev - 1);
          
          showSuccessToast(
            translations?.reviewDeleted || 'Success',
            translations?.reviewDeletedSuccess || 'Review deleted successfully'
          );
        } catch (error) {
          console.error('Error deleting review:', error);
          showErrorToast(
            translations?.errorDeletingReview || 'Error',
            translations?.failedToDeleteReview || 'Failed to delete review'
          );
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  // Handle review update success
  const handleReviewUpdated = async () => {
    setShowEditModal(false);
    setSelectedReview(null);
    
    showSuccessToast(
      translations?.reviewUpdated || 'Success',
      translations?.reviewUpdatedSuccess || 'Review updated successfully'
    );
    
    // Reload reviews
    loadReviews();
  };

  // Navigate to company profile
  const navigateToCompany = (companyId: string) => {
    const event = new CustomEvent('navigateToCompanyProfile', {
      detail: { companyId }
    });
    window.dispatchEvent(event);
  };
  
  // Check if we need to show empty state
  const showEmptyState = !loading && reviews.length === 0;
  
  // Error handling
  const handleEditError = (message: string) => {
    showErrorToast(
      translations?.error || 'Error',
      message
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4 rtl:space-x-reverse mb-6">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-800 transition-colors duration-200 rounded-lg hover:bg-gray-100 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>{translations?.backToHome || 'Back to Home'}</span>
            </button>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-lg" style={{ backgroundColor: '#194866' }}>
              <MessageSquare className="h-8 w-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#194866' }}>
              {translations?.myReviews || 'My Reviews'}
            </h1>
            <p className="text-lg text-gray-600">
              {translations?.myReviewsSubtitle || 'Manage and view all the reviews you\'ve left for companies'}
            </p>
            {totalReviews > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {translations?.totalReviewsCount?.replace('{count}', totalReviews.toString()) || 
                 `Total reviews: ${totalReviews}`}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Reviews List */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12" ref={reviewsContainerRef}>
        {loading && reviews.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="ml-3 text-gray-500">{translations?.loadingReviews || 'Loading your reviews...'}</span>
          </div>
        ) : showEmptyState ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {translations?.noReviewsYet || 'You haven\'t written any reviews yet'}
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {translations?.startReviewingCompanies || 'Start reviewing companies to help others make informed decisions.'}
            </p>
            <button
              onClick={() => onNavigate('categories')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              {translations?.browseCompanies || 'Browse Companies'}
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
                  {/* Company Header */}
                  <div 
                    className="flex items-center space-x-3 rtl:space-x-reverse mb-4 pb-4 border-b border-gray-100 cursor-pointer"
                    onClick={() => navigateToCompany(review.companyId)}
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center">
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
                      <h3 className="font-bold text-gray-900 hover:text-blue-600 transition-colors duration-200">
                        {review.companyName}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 space-x-2 rtl:space-x-reverse">
                        <Calendar className="w-4 h-4" />
                        <span>{review.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Review Content */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-5 w-5 ${
                                i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        {review.updatedAt > review.createdAt && (
                          <span className="text-xs text-gray-500">
                            {translations?.edited || '(edited)'}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-3 text-lg">{review.title}</h4>
                      <p className="text-gray-700 leading-relaxed mb-4">{review.content}</p>
                    </div>

                    {/* Action Buttons */}
                    {!review.companyReply ? (
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(review);
                          }}
                          className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors duration-200"
                          title={translations?.editReview || 'Edit Review'}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReview(review);
                          }}
                          disabled={actionLoading}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200 disabled:opacity-50"
                          title={translations?.deleteReview || 'Delete Review'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded-md">
                        {translations?.repliedReview || 'Company replied'}
                      </div>
                    )}
                  </div>
                  
                  {/* Company Reply */}
                  {review.companyReply && (
                    <div className="bg-gray-50 rounded-xl border-l-4 border-blue-500 overflow-hidden mt-4">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3 rtl:space-x-reverse">
                            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-white border-2 border-blue-500">
                              {review.companyLogo ? (
                                <img
                                  src={review.companyLogo}
                                  alt={review.companyName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Building2 className="h-5 w-5 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <span className="font-medium text-gray-900">{review.companyName}</span>
                              <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-600">
                                <Calendar className="h-3 w-3" />
                                <span>{review.companyReply.repliedAt.toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Toggle Reply Visibility */}
                          <button
                            onClick={() => toggleReplyExpansion(review.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                          >
                            {expandedReplies.has(review.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        
                        {/* Reply Content */}
                        <div className={`transition-all duration-300 ${
                          expandedReplies.has(review.id) ? 'block' : 'hidden'
                        }`}>
                          <p className="text-gray-700 leading-relaxed">{review.companyReply.content}</p>
                        </div>
                        
                        {!expandedReplies.has(review.id) && (
                          <p className="text-gray-700 leading-relaxed">
                            {review.companyReply.content.length > 100 
                              ? `${review.companyReply.content.substring(0, 100)}...`
                              : review.companyReply.content
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center py-8">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="inline-flex items-center space-x-2 rtl:space-x-reverse px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{translations?.loading || 'Loading...'}</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-5 w-5" />
                        <span>{translations?.loadMoreReviews || 'Load More Reviews'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* End of Reviews Indicator */}
              {!hasMore && reviews.length > 0 && (
                <div className="text-center py-8">
                  <div className="inline-flex items-center space-x-2 rtl:space-x-reverse text-gray-500">
                    <div className="h-px bg-gray-300 w-8"></div>
                    <span className="text-sm">{translations?.youveReachedEnd || 'You\'ve reached the end'}</span>
                    <div className="h-px bg-gray-300 w-8"></div>
                  </div>
                </div>
              )}
            </div>
          </>
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
          onSuccess={handleReviewUpdated}
          onError={handleEditError}
        />
      )}
    </div>
  );
};

export default MyReviews;