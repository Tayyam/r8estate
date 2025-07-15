import React, { useState, useEffect } from 'react';
import { MessageSquare, Star, User, Plus } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Project } from './types';
import { ProjectReview } from '../../../types/project-reviews';

interface ProjectReviewsTabProps {
  project: Project;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const ProjectReviewsTab: React.FC<ProjectReviewsTabProps> = ({ 
  project, 
  onSuccess, 
  onError 
}) => {
  const { currentUser } = useAuth();
  const { translations, language } = useLanguage();
  const [reviews, setReviews] = useState<ProjectReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddReview, setShowAddReview] = useState(false);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    title: '',
    content: '',
    isAnonymous: false
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  // Load project reviews
  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        
        const reviewsQuery = query(
          collection(db, 'projectReviews'),
          where('projectId', '==', project.id),
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
        })) as ProjectReview[];
        
        setReviews(reviewsData);
        
        // Calculate average rating
        if (reviewsData.length > 0) {
          const total = reviewsData.reduce((sum, review) => sum + review.rating, 0);
          setAverageRating(Math.round((total / reviewsData.length) * 10) / 10);
        }
        
        // Check if current user has already reviewed this project
        if (currentUser) {
          const hasReviewed = reviewsData.some(review => review.userId === currentUser.uid);
          setHasUserReviewed(hasReviewed);
        }
      } catch (error) {
        console.error('Error loading project reviews:', error);
        onError(translations?.failedToLoadReviews || 'Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };
    
    loadReviews();
  }, [project.id, currentUser]);

  // Handle rating change
  const handleRatingChange = (rating: number) => {
    setReviewForm({
      ...reviewForm,
      rating
    });
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string | boolean) => {
    setReviewForm({
      ...reviewForm,
      [field]: value
    });
  };

  // Handle form submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      onError(translations?.mustBeLoggedIn || 'You must be logged in to submit a review');
      return;
    }
    
    if (currentUser.role !== 'user') {
      onError(translations?.onlyUsersCanReview || 'Only regular users can submit reviews');
      return;
    }
    
    if (reviewForm.rating === 0 || !reviewForm.title.trim() || !reviewForm.content.trim()) {
      onError(translations?.pleaseFillAllFields || 'Please fill all required fields');
      return;
    }
    
    try {
      setSubmitLoading(true);
      
      // Create review document
      await addDoc(collection(db, 'projectReviews'), {
        projectId: project.id,
        userId: currentUser.uid,
        userName: reviewForm.isAnonymous ? (translations?.anonymousUser || 'Anonymous User') : (currentUser.displayName || currentUser.email),
        userEmail: currentUser.email,
        rating: reviewForm.rating,
        title: reviewForm.title.trim(),
        content: reviewForm.content.trim(),
        isAnonymous: reviewForm.isAnonymous,
        verified: currentUser.role === 'admin', // Admins are auto-verified
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Reset form and close
      setReviewForm({
        rating: 0,
        title: '',
        content: '',
        isAnonymous: false
      });
      setShowAddReview(false);
      
      // Show success message
      onSuccess(translations?.reviewAddedSuccess || 'Review added successfully');
      
      // Reload reviews
      const reviewsQuery = query(
        collection(db, 'projectReviews'),
        where('projectId', '==', project.id),
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
      })) as ProjectReview[];
      
      setReviews(reviewsData);
      setHasUserReviewed(true);
      
      // Recalculate average rating
      if (reviewsData.length > 0) {
        const total = reviewsData.reduce((sum, review) => sum + review.rating, 0);
        setAverageRating(Math.round((total / reviewsData.length) * 10) / 10);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      onError(translations?.failedToAddReview || 'Failed to add review');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Star rating component
  const StarRating = ({ 
    rating, 
    onRatingChange,
    readOnly = false
  }: { 
    rating: number; 
    onRatingChange?: (rating: number) => void;
    readOnly?: boolean;
  }) => {
    const [hoverRating, setHoverRating] = useState(0);

    return (
      <div className="flex items-center space-x-1 rtl:space-x-reverse">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange && !readOnly ? onRatingChange(star) : null}
            onMouseEnter={() => !readOnly && setHoverRating(star)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
            disabled={readOnly}
            className={`p-1 rounded transition-all duration-200 ${readOnly ? 'cursor-default' : 'hover:scale-110'}`}
          >
            <Star
              className={`w-6 h-6 transition-all duration-200 ${
                star <= (hoverRating || rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
            />
          </button>
        ))}
        {!readOnly && (
          <span className="ml-2 text-sm text-gray-600 font-medium">
            {rating > 0 ? `${rating} / 5` : (translations?.selectRating || 'Select rating')}
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Header with average rating */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {translations?.projectReviews || 'Project Reviews'}
            </h2>
            <p className="text-gray-600">
              {reviews.length > 0 
                ? `${reviews.length} ${translations?.reviews || 'reviews'}`
                : translations?.noReviewsYet || 'No reviews yet'
              }
            </p>
          </div>
          
          {/* Average Rating */}
          {reviews.length > 0 && (
            <div className="mt-4 md:mt-0 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <div className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
                <div>
                  <StarRating rating={Math.round(averageRating)} readOnly />
                  <p className="text-sm text-gray-500 mt-1">
                    {translations?.basedOnReviews?.replace('{count}', reviews.length.toString()) || 
                    `Based on ${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Add Review Button - Only show for logged in users who haven't reviewed yet */}
        {currentUser && currentUser.role === 'user' && !hasUserReviewed && (
          <button
            onClick={() => setShowAddReview(true)}
            className="inline-flex items-center space-x-2 rtl:space-x-reverse px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          >
            <Plus className="h-5 w-5" />
            <span>{translations?.writeReview || 'Write a Review'}</span>
          </button>
        )}
      </div>

      {/* Add Review Form */}
      {showAddReview && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 animate-fadeIn">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {translations?.writeReview || 'Write a Review'}
          </h3>
          
          <form onSubmit={handleSubmitReview} className="space-y-6">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.rating || 'Rating'} *
              </label>
              <StarRating rating={reviewForm.rating} onRatingChange={handleRatingChange} />
            </div>
            
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.reviewTitle || 'Review Title'} *
              </label>
              <input
                type="text"
                value={reviewForm.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={translations?.summarizeExperience || 'Summarize your experience...'}
                required
              />
            </div>
            
            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.yourReview || 'Your Review'} *
              </label>
              <textarea
                rows={4}
                value={reviewForm.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={translations?.tellOthersExperience || 'Tell others about your experience...'}
                required
              />
            </div>
            
            {/* Anonymous Option */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reviewForm.isAnonymous}
                  onChange={(e) => handleInputChange('isAnonymous', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">
                  {translations?.postAnonymously || 'Post anonymously'}
                </span>
              </label>
            </div>
            
            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 rtl:space-x-reverse">
              <button
                type="submit"
                disabled={submitLoading || reviewForm.rating === 0}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center"
              >
                {submitLoading ? (
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                ) : null}
                <span>
                  {submitLoading 
                    ? (translations?.submitting || 'Submitting...') 
                    : (translations?.submitReview || 'Submit Review')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowAddReview(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors duration-200"
              >
                {translations?.cancel || 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-6">
          {reviews.map(review => (
            <div key={review.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start space-x-4 rtl:space-x-reverse mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 rtl:space-x-reverse">
                    <h4 className="font-bold text-gray-900">{review.userName}</h4>
                    <div className="flex mt-2 sm:mt-0">
                      <StarRating rating={review.rating} readOnly />
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500 mt-1">{formatDate(review.createdAt)}</p>
                  
                  <h5 className="font-medium text-gray-900 mt-4 mb-2">{review.title}</h5>
                  <p className="text-gray-700">{review.content}</p>
                  
                  {/* Company Reply (if exists) */}
                  {review.companyReply && (
                    <div className="mt-4 bg-gray-50 p-4 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-center mb-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-2">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{project.companyName || 'Company Representative'}</div>
                          <div className="text-xs text-gray-500">{formatDate(review.companyReply.repliedAt)}</div>
                        </div>
                      </div>
                      <p className="text-gray-700">{review.companyReply.content}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-700 mb-2">
            {translations?.noReviewsYet || 'No Reviews Yet'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {translations?.beTheFirstToReview || 'Be the first to review this project and share your experience with others.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectReviewsTab;