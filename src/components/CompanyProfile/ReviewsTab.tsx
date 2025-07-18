import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, Edit, Trash2, AlertCircle, Reply } from 'lucide-react';
import { collection, query, where, orderBy, limit, startAfter, getDocs, deleteDoc, doc, updateDoc, increment, DocumentData, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Review } from '../../types/property';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import { User } from '../../types/user';
import { useNavigate, useLocation } from 'react-router-dom';
import { subDays, isAfter } from 'date-fns';
import AddReviewModal from './AddReviewModal';
import EditReviewModal from './EditReviewModal';
import ReplyModal from './ReplyModal';
import ReviewVotingButtons from './ReviewVotingButtons';
import WriteReviewTab from './WriteReviewTab';
import { getCompanySlug } from '../../utils/urlUtils';

// Import new components
import ReviewStats from './ReviewStats';
import ReviewFilters from './ReviewFilters';
import ReviewItem from './ReviewItem';

interface ReviewsTabProps {
  reviews: Review[];
  company: CompanyProfileType;
  onReviewAdded: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  userCanReview: boolean;
  hasUserReviewed: boolean;
  currentUser: User | null;
}

const REVIEWS_PER_PAGE = 5;

const ReviewsTab: React.FC<ReviewsTabProps> = ({ 
  reviews: initialReviews, 
  company, 
  onReviewAdded, 
  onSuccess, 
  onError,
  userCanReview,
  hasUserReviewed,
  currentUser
}) => {
  const { translations } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccessToast, showErrorToast } = useNotification();
  
  // State for pagination and lazy loading
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentData | null>(null);
  const [totalReviewsCount, setTotalReviewsCount] = useState(0);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  // Modal states
  const [showAddReview, setShowAddReview] = useState(false);
  const [showEditReview, setShowEditReview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  
  // Filter states
  const [ratingFilter, setRatingFilter] = useState<'all' | 1 | 2 | 3 | 4 | 5>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year'>('all');
  const [sortFilter, setSortFilter] = useState<'newest' | 'oldest'>('newest');
  const [responseFilter, setResponseFilter] = useState<'all' | 'with-response' | 'without-response'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // UI state
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [reviewsListener, setReviewsListener] = useState<() => void | null>(null);

  // Check if user can edit company (company owner or admin)
  const canEditCompany = currentUser && (
    currentUser.role === 'admin' || 
    (currentUser.role === 'company' && company?.email === currentUser.email)
  );

  // Sort reviews to show user's review first
  const sortReviewsWithUserFirst = (reviewsToSort: Review[]): Review[] => {
    if (!currentUser) return reviewsToSort;
    
    // Create a copy to avoid modifying the original array
    return [...reviewsToSort].sort((a, b) => {
      // If review A belongs to current user, it comes first
      if (a.userId === currentUser.uid) return -1;
      // If review B belongs to current user, it comes first
      if (b.userId === currentUser.uid) return 1;
      // Otherwise, sort by creation date (newest first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  };

  // Load reviews with pagination
  const loadReviews = async (loadMore = false) => {
    try {
      setLoading(true);
      
      let reviewsQuery = query(
        collection(db, 'reviews'),
        where('companyId', '==', company.id),
        orderBy('createdAt', 'desc'),
        limit(REVIEWS_PER_PAGE)
      );

      if (loadMore && lastDoc) {
        reviewsQuery = query(
          collection(db, 'reviews'),
          where('companyId', '==', company.id),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(REVIEWS_PER_PAGE)
        );
      }

      const reviewsSnapshot = await getDocs(reviewsQuery);
      const newReviews = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        companyReply: doc.data().companyReply ? {
          ...doc.data().companyReply,
          repliedAt: doc.data().companyReply.repliedAt?.toDate() || new Date()
        } : undefined
      })) as Review[];

      if (loadMore) {
        const combinedReviews = [...reviews, ...newReviews];
        setReviews(sortReviewsWithUserFirst(combinedReviews));
      } else {
        setReviews(sortReviewsWithUserFirst(newReviews));
        // Get total count on first load
        const allReviewsQuery = query(
          collection(db, 'reviews'),
          where('companyId', '==', company.id)
        );
        const allReviewsSnapshot = await getDocs(allReviewsQuery);
        setTotalReviewsCount(allReviewsSnapshot.size);
      }

      // Set pagination state
      setLastDoc(reviewsSnapshot.docs[reviewsSnapshot.docs.length - 1] || null);
      setHasMore(reviewsSnapshot.docs.length === REVIEWS_PER_PAGE);
      setReviewsLoaded(true);

    } catch (error) {
      console.error('Error loading reviews:', error);
      onError(translations?.failedToLoadReviews || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  // Load reviews on component mount
  useEffect(() => {
    if (currentUser) {
      // Set up real-time listener for reviews
      setupReviewsListener();
    }

    // Cleanup listener on component unmount
    return () => {
      if (reviewsListener) {
        reviewsListener();
      }
    }
  }, [company.id, currentUser]);
  
  // Setup real-time listener for reviews
  const setupReviewsListener = () => {
    const reviewsQuery = query(
      collection(db, 'reviews'),
      where('companyId', '==', company.id),
      orderBy('createdAt', 'desc')
    );
    
    // Create listener and store unsubscribe function
    const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
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
      
      setReviews(sortReviewsWithUserFirst(reviewsData));
      setTotalReviewsCount(reviewsData.length);
      setReviewsLoaded(true);
      setLoading(false);
    }, (error) => {
      console.error('Error getting reviews:', error);
      onError(translations?.failedToLoadReviews || 'Failed to load reviews');
      setLoading(false);
    });
    
    setReviewsListener(() => unsubscribe);
  };

  // Initialize reviews with sorted initial reviews
  useEffect(() => {
    if (initialReviews && initialReviews.length > 0 && !reviewsLoaded) {
      setReviews(sortReviewsWithUserFirst(initialReviews));
      setTotalReviewsCount(initialReviews.length);
      setReviewsLoaded(true);
    }
  }, [initialReviews, currentUser, reviewsLoaded]);

  // Calculate average rating
  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  };

  // Get date filter range
  const getDateFilterRange = (): Date | null => {
    const now = new Date();
    
    switch (timeFilter) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'yesterday':
        return subDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1);
      case 'week':
        return subDays(now, 7);
      case 'month':
        return subDays(now, 30);
      case 'year':
        return subDays(now, 365);
      default:
        return null;
    }
  };

  // Apply filters to reviews
  const getFilteredReviews = () => {
    let filteredReviews = [...reviews];
    
    // Apply rating filter
    if (ratingFilter !== 'all') {
      const ratingValue = typeof ratingFilter === 'string' ? parseInt(ratingFilter) : ratingFilter;
      filteredReviews = filteredReviews.filter(review => review.rating === ratingValue);
    }
    
    // Apply the new response filter
    if (responseFilter === 'with-response') {
      filteredReviews = filteredReviews.filter(review => Boolean(review.companyReply));
    } else if (responseFilter === 'without-response') {
      filteredReviews = filteredReviews.filter(review => !review.companyReply);
    }
    
    // Apply time filter
    const dateFilter = getDateFilterRange();
    if (dateFilter) {
      filteredReviews = filteredReviews.filter(review => isAfter(review.createdAt, dateFilter));
    }
    
    // Apply sort order
    filteredReviews.sort((a, b) => {
      switch(sortFilter) {
        case 'highest-rating':
          // Sort by rating (highest first), then by date (newest first) if ratings are equal
          return b.rating !== a.rating 
            ? b.rating - a.rating 
            : b.createdAt.getTime() - a.createdAt.getTime();
        case 'lowest-rating':
          // Sort by rating (lowest first), then by date (newest first) if ratings are equal
          return a.rating !== b.rating 
            ? a.rating - b.rating 
            : b.createdAt.getTime() - a.createdAt.getTime();
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'newest':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });
    
    return filteredReviews;
  };

  // Get filtered reviews
  const filteredReviews = getFilteredReviews();
  
  // Check if any filters are applied
  const hasFilters = ratingFilter !== 'all' || timeFilter !== 'all' || sortFilter !== 'newest' || responseFilter !== 'all';

  // Handle clearing filters
  const handleClearFilters = () => {
    setRatingFilter('all');
    setTimeFilter('all');
    setSortFilter('newest');
    setResponseFilter('all');
  };

  const averageRating = calculateAverageRating();

  // Handle review deletion confirmation
  const handleDeleteReview = async () => {
    if (!selectedReview || !currentUser) return;

    // Check permissions - admins and company owners can delete any review
    const canDelete = currentUser.uid === selectedReview.userId || 
                     currentUser.role === 'admin' || 
                     canEditCompany;
    
    if (!canDelete) {
      onError(translations?.canOnlyDeleteOwnReviews || 'You can only delete your own reviews');
      return;
    }

    try {
      setActionLoading(true);
      
      // Delete review from Firestore
      await deleteDoc(doc(db, 'reviews', selectedReview.id));
      
      // Update company rating and count
      await updateCompanyRating();
      
      onSuccess(translations?.reviewDeletedSuccess || 'Review deleted successfully!');
      setShowDeleteConfirm(false);
      setSelectedReview(null);
      
      // No need to reload reviews - the listener will update automatically
      onReviewAdded();
    } catch (error: any) {
      console.error('Error deleting review:', error);
      onError(translations?.failedToDeleteReview || 'Failed to delete review. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Update company's average rating in Firestore
  const updateCompanyRating = async () => {
    try {
      const companyRef = doc(db, 'companies', company.id);
      
      // Get fresh reviews data to calculate accurate average
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('companyId', '==', company.id)
      );
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const currentReviews = reviewsSnapshot.docs.map(doc => doc.data() as Review);
      
      const newAverageRating = currentReviews.length > 0 
        ? currentReviews.reduce((sum, review) => sum + review.rating, 0) / currentReviews.length 
        : 0;
      
      const roundedRating = Math.round(newAverageRating * 10) / 10;
      
      await updateDoc(companyRef, {
        totalRating: roundedRating,
        rating: roundedRating, // Also update the rating field
        totalReviews: currentReviews.length,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating company rating:', error);
    }
  };

  // Handle edit review success
  const handleEditReviewSuccess = async () => {
    await updateCompanyRating();
    onSuccess(translations?.reviewUpdatedSuccess || 'Review updated successfully!');
    setShowEditReview(false);
    setSelectedReview(null);
    // No need to reload reviews - the listener will update automatically
    onReviewAdded();
  };

  // Handle add review success
  const handleAddReviewSuccess = async () => {
    await updateCompanyRating();
    setShowAddReview(false);
    onSuccess(translations?.reviewAddedSuccess || 'Review added successfully!');
    // No need to reload reviews - the listener will update automatically
    onReviewAdded();
  };

  // Handle reply success
  const handleReplySuccess = async () => {
    setShowReplyModal(false);
    setSelectedReview(null);
    // No need to reload reviews - the listener will update automatically
    onSuccess(translations?.replyAddedSuccess || 'Reply added successfully!');
  };

  // Handle edit review error
  const handleEditReviewError = (message: string) => {
    onError(message);
  };

  // Check if user can modify a review
  const canModifyReview = (review: Review) => {
    return currentUser && (
      currentUser.uid === review.userId || 
      currentUser.role === 'admin' ||
      canEditCompany
    );
  };

  // Open edit modal
  const openEditModal = (review: Review) => {
    // Prevent editing if company has replied
    if (review.companyReply) {
      showErrorToast(
        translations?.error || 'Error',
        translations?.cannotEditAfterReply || 'Reviews with company replies cannot be edited to maintain conversation integrity'
      );
      return;
    }
    
    setSelectedReview(review);
    setShowEditReview(true);
  };

  // Open delete confirmation
  const openDeleteConfirm = (review: Review) => {
    // Prevent deletion if company has replied
    if (review.companyReply) {
      showErrorToast(
        translations?.error || 'Error', 
        translations?.cannotDeleteAfterReply || 'Reviews with company replies cannot be deleted to maintain conversation integrity'
      );
      return;
    }
    
    setSelectedReview(review);
    setShowDeleteConfirm(true);
  };

  // Open reply modal
  const openReplyModal = (review: Review) => {
    setSelectedReview(review);
    setShowReplyModal(true);
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

  // Load more reviews when "Load More" is clicked
  const loadMoreReviews = async () => {
    if (!lastDoc) return;
    
    try {
      setLoading(true);
      
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('companyId', '==', company.id),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(REVIEWS_PER_PAGE)
      );

      const reviewsSnapshot = await getDocs(reviewsQuery);
      const newReviews = reviewsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        companyReply: doc.data().companyReply ? {
          ...doc.data().companyReply,
          repliedAt: doc.data().companyReply.repliedAt?.toDate() || new Date()
        } : undefined
      })) as Review[];

      setReviews(prev => sortReviewsWithUserFirst([...prev, ...newReviews]));
      setLastDoc(reviewsSnapshot.docs[reviewsSnapshot.docs.length - 1] || null);
      setHasMore(reviewsSnapshot.docs.length === REVIEWS_PER_PAGE);
    } catch (error) {
      console.error('Error loading more reviews:', error);
      onError(translations?.failedToLoadReviews || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  // Load more reviews
  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMoreReviews();
    }
  };

  // Handle login redirect for writing review
  const handleLoginToReview = () => {
    // Get the current URL to return after login
    const returnUrl = location.pathname;
    navigate(`/login?returnTo=${encodeURIComponent(returnUrl)}`);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (reviewsListener) {
        reviewsListener();
      }
    }
  }, []);

  return (
    <div>
      {/* Write Review Section - Only show if user can review and hasn't reviewed yet */}
      {userCanReview && !hasUserReviewed && (
        <div id="write-review-section" className="mb-10">
          <WriteReviewTab
            company={company}
            onReviewAdded={onReviewAdded}
            onSuccess={onSuccess}
            onError={onError}
          />
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {translations?.customerReviews || 'Customer Reviews'}
          </h2>
          <p className="text-gray-600">
            {totalReviewsCount > 0 
              ? (translations?.reviewsFromVerified?.replace('{count}', totalReviewsCount.toString()) || `${totalReviewsCount} review${totalReviewsCount > 1 ? 's' : ''} from verified customers`)
              : (reviews.length > 0 || loading
                  ? (translations?.reviewsFromVerified?.replace('{count}', reviews.length.toString()) || `${reviews.length} review${reviews.length > 1 ? 's' : ''} from verified customers`)
                  : (translations?.noReviewsYet || 'No reviews yet - be the first to share your experience!')
                )
            }
            {totalReviewsCount > reviews.length && reviewsLoaded && (
              <span className="text-sm text-gray-500 ml-2">
                ({translations?.showing || 'Showing'} {reviews.length} {translations?.of || 'of'} {totalReviewsCount})
              </span>
            )}
          </p>
        </div>
        
        {/* Add Review Button */}
        <button
          onClick={currentUser ? () => setShowAddReview(true) : handleLoginToReview}
          className="flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"/>
            <path d="M12 5v14"/>
          </svg>
          <span>{translations?.addReview || 'Add Review'}</span>
        </button>
      </div>

      {loading && !reviewsLoaded ? (
        <div className="animate-pulse">
          <div className="h-64 bg-gray-100 rounded-xl mb-8"></div>
        </div>
      ) : reviews.length > 0 ? (
        <ReviewStats 
          reviews={reviews} 
          averageRating={averageRating}
          totalReviews={totalReviewsCount}
        />
      ) : null}

      {/* Filters */}
      <ReviewFilters 
        ratingFilter={ratingFilter}
        timeFilter={timeFilter}
        sortFilter={sortFilter}
        responseFilter={responseFilter}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        setRatingFilter={setRatingFilter}
        setTimeFilter={setTimeFilter}
        setSortFilter={setSortFilter}
        setResponseFilter={setResponseFilter}
        hasFilters={hasFilters}
        handleClearFilters={handleClearFilters}
        filteredReviews={filteredReviews}
        reviews={reviews}
      />

      {/* Reviews List */}
      {loading && !reviewsLoaded ? (
        <div className="animate-pulse space-y-6">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : filteredReviews.length > 0 ? (
        <div className="space-y-6">
          {filteredReviews.map(review => (
            <ReviewItem 
              key={review.id}
              review={review}
              company={company}
              currentUser={currentUser}
              isHighlighted={new URLSearchParams(location.search).get('review') === review.id}
              onReply={openReplyModal}
              onEdit={openEditModal}
              onDelete={openDeleteConfirm}
              expandedReplies={expandedReplies}
              toggleReplyExpansion={toggleReplyExpansion}
            />
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
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
      ) : filteredReviews.length === 0 && reviews.length > 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-md">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Filter className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            {translations?.noReviewsMatchFilters || 'No reviews match your filters'}
          </h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            {translations?.tryAdjustingFilters || 'Try adjusting your filters to see more reviews.'}
          </p>
          <button
            onClick={() => {
              setRatingFilter('all');
              setTimeFilter('all');
              setSortFilter('newest');
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            {translations?.clearFilters || 'Clear Filters'}
          </button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16">
          {/* Empty State */}
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            {translations?.noReviewsYet || 'No reviews yet'}
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {translations?.shareExperience?.replace('{company}', company.name) || 
             `Be the first to share your experience with ${company.name}. Your review will help others make informed decisions.`}
          </p>
          <button
            onClick={currentUser ? () => setShowAddReview(true) : handleLoginToReview}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Plus className="h-5 w-5" />
            <span>{currentUser ? (translations?.writeFirstReview || 'Write First Review') : (translations?.signInToReview || 'Sign In to Write a Review')}</span>
          </button>
        </div>
      ) : null}

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

      {/* Add Review Modal */}
      {showAddReview && currentUser && (
        <AddReviewModal
          company={company}
          onClose={() => setShowAddReview(false)}
          onSuccess={handleAddReviewSuccess}
          onError={onError}
        />
      )}

      {/* Edit Review Modal */}
      {showEditReview && selectedReview && (
        <EditReviewModal
          review={selectedReview}
          onClose={() => {
            setShowEditReview(false);
            setSelectedReview(null);
          }}
          onSuccess={handleEditReviewSuccess}
          onError={handleEditReviewError}
        />
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedReview && (
        <ReplyModal
          review={selectedReview}
          company={company}
          onClose={() => {
            setShowReplyModal(false);
            setSelectedReview(null);
          }}
          onSuccess={handleReplySuccess}
          onError={onError}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {translations?.deleteReview || 'Delete Review'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {translations?.confirmDeleteReview || 'Are you sure you want to delete this review? This action cannot be undone.'}
                </p>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse">
                  <button
                    onClick={handleDeleteReview}
                    disabled={actionLoading}
                    className="flex-1 bg-red-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-red-700 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 rtl:space-x-reverse"
                  >
                    {actionLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{translations?.deletingReview || 'Deleting...'}</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>{translations?.deleteReviewButton || 'Delete Review'}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setSelectedReview(null);
                    }}
                    disabled={actionLoading}
                    className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-400 transition-all duration-200 disabled:opacity-50"
                  >
                    {translations?.cancel || 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsTab;