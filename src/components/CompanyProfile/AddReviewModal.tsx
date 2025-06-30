import React, { useState } from 'react';
import { Star, MessageSquare, User, AlertCircle, X } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, increment, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';

interface AddReviewModalProps {
  company: CompanyProfileType;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

interface RatingCategory {
  key: string;
  label: string;
}

const AddReviewModal: React.FC<AddReviewModalProps> = ({
  company,
  onClose,
  onSuccess,
  onError
}) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    content: '',
    isAnonymous: false,
    ratingDetails: {
      communication: 0,
      valueForMoney: 0,
      friendliness: 0,
      responsiveness: 0
    }
  });

  const ratingCategories: RatingCategory[] = [
    { key: 'communication', label: translations?.communication || 'Communication' },
    { key: 'valueForMoney', label: translations?.valueForMoney || 'Value for Money' },
    { key: 'friendliness', label: translations?.friendliness || 'Friendliness' },
    { key: 'responsiveness', label: translations?.responsiveness || 'Responsiveness' }
  ];

  // Calculate average rating from all categories
  const calculateAverageRating = () => {
    const { communication, valueForMoney, friendliness, responsiveness } = formData.ratingDetails;
    const sum = communication + valueForMoney + friendliness + responsiveness;
    return sum > 0 ? Math.round(sum / 4) : 0;
  };

  // Star rating component
  const StarRating = ({ 
    rating, 
    onRatingChange 
  }: { 
    rating: number; 
    onRatingChange: (rating: number) => void 
  }) => {
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
              className={`w-6 h-6 transition-all duration-200 ${
                star <= (hoverRating || rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600 font-medium">
          {rating > 0 ? `${rating} / 5` : (translations?.selectRating || 'Select rating')}
        </span>
      </div>
    );
  };

  // Update company's average rating in Firestore
  const updateCompanyRating = async () => {
    try {
      // Get all reviews for this company to calculate accurate average
      const reviewsQuery = query(
        collection(db, 'reviews'),
        where('companyId', '==', company.id)
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
      
      const companyRef = doc(db, 'companies', company.id);
      await updateDoc(companyRef, {
        totalRating: roundedRating,
        rating: roundedRating, // Also update the rating field
        totalReviews: allReviews.length,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating company rating:', error);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      onError(translations?.mustBeLoggedIn || 'You must be logged in to add a review');
      return;
    }

    // Check if any of the category ratings are 0
    const { communication, valueForMoney, friendliness, responsiveness } = formData.ratingDetails;
    if (communication === 0 || valueForMoney === 0 || friendliness === 0 || responsiveness === 0) {
      onError(translations?.pleaseRateAllCategories || 'Please rate all categories');
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      onError(translations?.pleaseFillAllFields || 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);

      // Calculate average rating
      const overallRating = calculateAverageRating();

      // Add review to Firestore
      await addDoc(collection(db, 'reviews'), {
        companyId: company.id,
        userId: currentUser.uid,
        userName: formData.isAnonymous ? (translations?.anonymousUser || 'Anonymous User') : (currentUser.displayName || currentUser.email),
        userEmail: currentUser.email,
        rating: overallRating,
        ratingDetails: formData.ratingDetails,
        title: formData.title.trim(),
        content: formData.content.trim(),
        isAnonymous: formData.isAnonymous,
        verified: currentUser.role === 'admin', // Admins are auto-verified
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Update company's rating and review count
      await updateCompanyRating();

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error adding review:', error);
      onError(translations?.failedToAddReview || 'Failed to add review. Please try again.');
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
  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle rating changes for a specific category
  const handleCategoryRatingChange = (category: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      ratingDetails: {
        ...prev.ratingDetails,
        [category]: value
      }
    }));
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {translations?.addReviewTitle || 'Add Review'}
              </h3>
              <p className="text-sm text-gray-600">
                {translations?.shareExperienceWith?.replace('{company}', company.name) || `Share your experience with ${company.name}`}
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
                {currentUser?.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-white" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {currentUser?.displayName || currentUser?.email}
                </p>
                <p className="text-sm text-gray-600">
                  {translations?.reviewingAs?.replace('{role}', currentUser?.role || 'user') || `Reviewing as: ${currentUser?.role}`}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <input
                type="checkbox"
                id="anonymous"
                checked={formData.isAnonymous}
                onChange={(e) => handleInputChange('isAnonymous', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="anonymous" className="ml-2 block text-sm text-gray-700">
                {translations?.postAnonymously || 'Post anonymously'}
                <span className="text-xs text-gray-500 block mt-1">
                  {translations?.adminCanSeeIdentity || '(Only platform administrators can see your identity)'}
                </span>
              </label>
            </div>
          </div>

          {/* Rating Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              {translations?.rateYourExperience || 'Rate Your Experience'} *
            </label>
            <div className="space-y-6">
              {ratingCategories.map((category) => (
                <div key={category.key} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-800">
                      {category.label}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {formData.ratingDetails[category.key as keyof typeof formData.ratingDetails] > 0 
                        ? `${formData.ratingDetails[category.key as keyof typeof formData.ratingDetails]}/5` 
                        : ''}
                    </span>
                  </div>
                  <StarRating 
                    rating={formData.ratingDetails[category.key as keyof typeof formData.ratingDetails]} 
                    onRatingChange={(rating) => handleCategoryRatingChange(category.key, rating)} 
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 py-4 border-t border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-800">
                  {translations?.overallRating || 'Overall Rating'}
                </h4>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`w-5 h-5 ${
                        star <= calculateAverageRating() 
                          ? 'text-yellow-400 fill-current' 
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {calculateAverageRating() > 0 ? `${calculateAverageRating()}/5` : '-'}
                  </span>
                </div>
              </div>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {translations?.charactersLimit?.replace('{current}', formData.title.length.toString()).replace('{max}', '100') || `${formData.title.length}/100 characters`}
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
              placeholder={translations?.tellOthersExperience || 'Tell others about your experience with this company. What did you like? What could be improved?'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">
              {translations?.charactersLimit?.replace('{current}', formData.content.length.toString()).replace('{max}', '1000') || `${formData.content.length}/1000 characters`}
            </p>
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="flex items-start space-x-3 rtl:space-x-reverse">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-2">{translations?.reviewGuidelines || 'Review Guidelines'}</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>{translations?.beHonestConstructive || '• Be honest and constructive in your feedback'}</li>
                  <li>{translations?.focusPersonalExperience || '• Focus on your personal experience'}</li>
                  <li>{translations?.keepRespectful || '• Keep it respectful and professional'}</li>
                  <li>{translations?.avoidPersonalInfo || '• Avoid sharing personal information'}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 rtl:space-x-reverse pt-4">
            <button
              type="submit"
              disabled={loading || !calculateAverageRating() || !formData.title.trim() || !formData.content.trim()}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 rtl:space-x-reverse"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{translations?.submitting || 'Submitting...'}</span>
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5" />
                  <span>{translations?.submitReview || 'Submit Review'}</span>
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

export default AddReviewModal;