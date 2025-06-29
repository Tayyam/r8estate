import React, { useState } from 'react';
import { Star, MessageSquare, User, AlertCircle, X, Edit } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Review } from '../../types/property';

interface EditReviewModalProps {
  review: Review;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

const EditReviewModal: React.FC<EditReviewModalProps> = ({
  review,
  onClose,
  onSuccess,
  onError
}) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rating: review.rating,
    title: review.title,
    content: review.content
  });

  // Star rating component
  const StarRating = ({ rating, onRatingChange }: { rating: number; onRatingChange: (rating: number) => void }) => {
    const [hoverRating, setHoverRating] = useState(0);

    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 rounded transition-all duration-200 hover:scale-110"
          >
            <Star
              className={`w-8 h-8 transition-all duration-200 ${
                star <= (hoverRating || rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
            />
          </button>
        ))}
        <span className="ml-3 text-sm text-gray-600 font-medium">
          {rating > 0 ? `${rating} / 5` : (translations?.selectRating || 'Select rating')}
        </span>
      </div>
    );
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      onError(translations?.mustBeLoggedIn || 'You must be logged in to edit a review');
      return;
    }

    // Check permissions
    const canEdit = currentUser.uid === review.userId || currentUser.role === 'admin';
    if (!canEdit) {
      onError(translations?.canOnlyEditOwnReviews || 'You can only edit your own reviews');
      return;
    }

    if (formData.rating === 0) {
      onError(translations?.pleaseSelectRating || 'Please select a rating');
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      onError(translations?.pleaseFillAllFields || 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      // Update review in Firestore
      const reviewRef = doc(db, 'reviews', review.id);
      await updateDoc(reviewRef, {
        rating: formData.rating,
        title: formData.title.trim(),
        content: formData.content.trim(),
        updatedAt: new Date()
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating review:', error);
      onError(translations?.failedToUpdateReview || 'Failed to update review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <Edit className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {translations?.editReview || 'Edit Review'}
              </h3>
              <p className="text-sm text-gray-600">
                {translations?.updateYourReview || 'Update your review'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* User Info Display */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {review.userName}
                </p>
                <p className="text-sm text-gray-600">
                  {translations?.originalReview?.replace('{date}', review.createdAt.toLocaleDateString()) || 
                   `Original review: ${review.createdAt.toLocaleDateString()}`}
                </p>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {translations?.rating || 'Rating'} *
            </label>
            <div className="bg-gray-50 rounded-xl p-4">
              <StarRating 
                rating={formData.rating} 
                onRatingChange={(rating) => handleInputChange('rating', rating)} 
              />
              <p className="text-xs text-gray-500 mt-2">
                {translations?.clickStarsToRate || 'Click the stars to rate your experience'}
              </p>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translations?.reviewTitle || 'Review Title'} *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder={translations?.summarizeExperience || 'Summarize your experience...'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {translations?.charactersLimit?.replace('{current}', formData.title.length.toString()).replace('{max}', '100') || 
               `${formData.title.length}/100 characters`}
            </p>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {translations?.yourReview || 'Your Review'} *
            </label>
            <textarea
              required
              rows={5}
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder={translations?.tellOthersExperience || 'Tell others about your experience with this company...'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all duration-200 resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {translations?.charactersLimit?.replace('{current}', formData.content.length.toString()).replace('{max}', '1000') || 
               `${formData.content.length}/1000 characters`}
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
            <button
              type="submit"
              disabled={loading || formData.rating === 0 || !formData.title.trim() || !formData.content.trim()}
              className="flex-1 bg-orange-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{translations?.updating || 'Updating...'}</span>
                </>
              ) : (
                <>
                  <Edit className="h-5 w-5" />
                  <span>{translations?.updateReview || 'Update Review'}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-400 transition-all duration-200 disabled:opacity-50"
            >
              {translations?.cancel || 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditReviewModal;