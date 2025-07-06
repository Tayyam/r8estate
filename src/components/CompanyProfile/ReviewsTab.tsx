import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Building2, Star, Plus, Calendar, Shield, Edit, Trash2, AlertCircle, Reply, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { collection, query, where, orderBy, limit, startAfter, getDocs, deleteDoc, doc, updateDoc, increment, DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Review } from '../../types/property';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import { User } from '../../types/user';
import { useNavigate, useLocation } from 'react-router-dom';
import AddReviewModal from './AddReviewModal';
import EditReviewModal from './EditReviewModal';
import ReplyModal from './ReplyModal';
import ReviewVotingButtons from './ReviewVotingButtons';
import ReportButton from './ReportButton';
import WriteReviewTab from './WriteReviewTab';

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
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // UI state
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

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
    loadReviews();
  }, [company.id]);

  // Initialize reviews with sorted initial reviews
  useEffect(() => {
    if (initialReviews && initialReviews.length > 0 && !reviewsLoaded) {
      setReviews(sortReviewsWithUserFirst(initialReviews));
      setTotalReviewsCount(initialReviews.length);
      setReviewsLoaded(true);
    }
  }, [initialReviews, currentUser, reviewsLoaded]);

  // Calculate average rating
  const averageRating = totalReviewsCount > 0 && reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  // Group reviews by rating for distribution (based on loaded reviews)
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(review => review.rating === rating).length,
    percentage: reviews.length > 0 ? (reviews.filter(review => review.rating === rating).length / reviews.length) * 100 : 0
  }));

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

  // Handle delete review
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
      
      // Reload reviews
      await loadReviews();
      onReviewAdded();
    } catch (error: any) {
      console.error('Error deleting review:', error);
      onError(translations?.failedToDeleteReview || 'Failed to delete review. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle edit review success
  const handleEditReviewSuccess = async () => {
    await updateCompanyRating();
    onSuccess(translations?.reviewUpdatedSuccess || 'Review updated successfully!');
    setShowEditReview(false);
    setSelectedReview(null);
    await loadReviews(); // Reload reviews
    onReviewAdded();
  };

  // Handle add review success
  const handleAddReviewSuccess = async () => {
    await updateCompanyRating();
    setShowAddReview(false);
    onSuccess(translations?.reviewAddedSuccess || 'Review added successfully!');
    await loadReviews(); // Reload reviews
    onReviewAdded();
  };

  // Handle reply success
  const handleReplySuccess = async () => {
    setShowReplyModal(false);
    setSelectedReview(null);
    onSuccess(translations?.replyAddedSuccess || 'Reply added successfully!');
    await loadReviews(); // Reload reviews
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
    setSelectedReview(review);
    setShowEditReview(true);
  };

  // Open delete confirmation
  const openDeleteConfirm = (review: Review) => {
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

  // Load more reviews
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadReviews(true);
    }
  };

  // Render detailed ratings if available
  const renderDetailedRatings = (review: Review) => {
    if (!review.ratingDetails) return null;
    
    const ratingDetails = review.ratingDetails;
    const categories = [
      { key: 'communication', label: translations?.communication || 'Communication' },
      { key: 'valueForMoney', label: translations?.valueForMoney || 'Value for Money' },
      { key: 'friendliness', label: translations?.friendliness || 'Friendliness' },
      { key: 'responsiveness', label: translations?.responsiveness || 'Responsiveness' }
    ];
    
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        {categories.map((category) => {
          const rating = ratingDetails[category.key as keyof typeof ratingDetails] || 0;
          if (rating === 0) return null;
          
          return (
            <div key={category.key} className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-gray-600">
              <span>{category.label}:</span>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-3 h-3 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Handle login redirect for writing review
  const handleLoginToReview = () => {
    // Get the current URL to return after login
    const returnUrl = location.pathname;
    navigate(`/login?returnTo=${encodeURIComponent(returnUrl)}`);
  };

  // Show loading placeholder
  const renderLoadingPlaceholder = () => {
    return (
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
    );
  };

  return (
    <div>
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
          <Plus className="h-5 w-5" />
          <span>{translations?.addReview || 'Add Review'}</span>
        </button>
      </div>

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

      {/* Rating Overview */}
      {loading && !reviewsLoaded ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="text-center lg:text-left">
              <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6 rtl:space-x-reverse">
                <div className="mb-4 lg:mb-0">
                  <div className="h-12 bg-gray-200 rounded w-24 mx-auto lg:mx-0 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-32 mx-auto lg:mx-0 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-40 mx-auto lg:mx-0"></div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                  <div className="flex-1 h-2 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-8"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : reviews.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Average Rating */}
            <div className="text-center lg:text-left">
              <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6 rtl:space-x-reverse">
                <div className="mb-4 lg:mb-0">
                  <div className="text-5xl font-bold text-gray-900 mb-2">
                    {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
                  </div>
                  <div className="flex items-center justify-center lg:justify-start space-x-1 rtl:space-x-reverse mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-6 w-6 ${
                          i < Math.round(averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-600">
                    {translations?.basedOnReviews?.replace('{count}', totalReviewsCount.toString()) || 
                     `Based on ${totalReviewsCount} review${totalReviewsCount > 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-3">
              {ratingDistribution.map(({ rating, count, percentage }) => (
                <div key={rating} className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className="flex items-center space-x-1 rtl:space-x-reverse w-12">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-8 text-right rtl:text-left">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Reviews List */}
      {loading && !reviewsLoaded ? (
        renderLoadingPlaceholder()
      ) : reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
                <div className="flex items-start space-x-4 rtl:space-x-reverse flex-1">
                  {/* User Avatar */}
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">
                      {review.userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse mb-1">
                      <h3 className="font-bold text-gray-900">{review.userName}</h3>
                      {review.verified && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 rtl:space-x-reverse">
                          <Shield className="h-3 w-3" />
                          <span>{translations?.verified || 'Verified'}</span>
                        </span>
                      )}
                      {review.isAnonymous && (
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                          {translations?.anonymous || 'Anonymous'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className="flex items-center space-x-1 rtl:space-x-reverse">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {review.createdAt.toLocaleDateString()}
                        {review.updatedAt > review.createdAt && (
                          <span className="text-xs text-gray-500 ml-2 rtl:ml-0 rtl:mr-2">
                            {translations?.edited || '(edited)'}
                          </span>
                        )}
                      </span>
                    </div>
                    
                    {/* Detailed Ratings */}
                    {review.ratingDetails && renderDetailedRatings(review)}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  {/* Reply Button (for company owners and admins) */}
                  {canEditCompany && !review.companyReply && (
                    <button
                      onClick={() => openReplyModal(review)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                      title={translations?.replyToReview || 'Reply to Review'}
                    >
                      <Reply className="h-4 w-4" />
                    </button>
                  )}
                  
                  {/* Edit Button (for review owner and admins) */}
                  {(currentUser?.uid === review.userId || currentUser?.role === 'admin') && (
                    <button
                      onClick={() => openEditModal(review)}
                      className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors duration-200"
                      title={translations?.editReview || 'Edit Review'}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                  
                  {/* Delete Button */}
                  {canModifyReview(review) && (
                    <button
                      onClick={() => openDeleteConfirm(review)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                      title={translations?.deleteReview || 'Delete Review'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <h4 className="font-semibold text-gray-900 mb-3 text-lg">{review.title}</h4>
              <p className="text-gray-700 leading-relaxed mb-6">{review.content}</p>
              
              {/* Review Voting Buttons */}
              <div className="flex justify-end mb-4">
                <ReviewVotingButtons 
                  reviewId={review.id} 
                  reviewUserId={review.userId} 
                  companyId={company.id}
                />
              </div>
              
              {/* Company Reply */}
              {review.companyReply && (
                <div className="bg-gray-50 rounded-xl border-l-4 border-blue-500 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-white border-2 border-blue-500">
                          {company.logoUrl ? (
                            <img
                              src={company.logoUrl}
                              alt={company.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{company.name}</span>
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
                  
                  {/* Add Report button for company replies */}
                  {currentUser && review.companyReply && (
                    <div className="mt-2 flex justify-end">
                      <ReportButton 
                        contentType="reply"
                        contentId={review.id}
                        contentOwnerId={review.companyReply.repliedBy}
                        companyId={company.id}
                      />
                    </div>
                  )}
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
      ) : !loading ? (
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