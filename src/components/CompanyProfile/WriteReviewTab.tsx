import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, User, AlertCircle, Edit } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { CompanyProfile as CompanyProfileType } from '../../types/companyProfile';
import { Review } from '../../types/property';

interface WriteReviewTabProps {
  company: CompanyProfileType;
  onReviewAdded: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface RatingCategory {
  key: string;
  label: string;
}

const WriteReviewTab: React.FC<WriteReviewTabProps> = ({
  company,
  onReviewAdded,
  onSuccess,
  onError
}) => {
  const { currentUser } = useAuth();
  const { translations } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
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

  // Check if user has already reviewed this company
  useEffect(() => {
    const checkExistingReview = async () => {
      if (!currentUser) return;
      
      try {
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('companyId', '==', company.id),
          where('userId', '==', currentUser.uid)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        
        if (!reviewsSnapshot.empty) {
          const reviewData = reviewsSnapshot.docs[0].data();
          const review = {
            id: reviewsSnapshot.docs[0].id,
            ...reviewData,
            createdAt: reviewData.createdAt?.toDate() || new Date(),
            updatedAt: reviewData.updatedAt?.toDate() || new Date(),
            companyReply: reviewData.companyReply ? {
              ...reviewData.companyReply,
              repliedAt: reviewData.companyReply.repliedAt?.toDate() || new Date()
            } : undefined
          } as Review;
          
          setUserReview(review);
          
          // Set form data for editing
          setFormData({
            rating: review.rating,
            title: review.title,
            content: review.content,
            isAnonymous: review.isAnonymous || false,
            ratingDetails: review.ratingDetails || {
              communication: 0,
              valueForMoney: 0,
              friendliness: 0,
              responsiveness: 0
            }
          });
        }
      } catch (error) {
        console.error('Error checking existing review:', error);
      }
    };
    
    checkExistingReview();
  }, [currentUser, company.id]);

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
      // Get all reviews for this company
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

  // Handle add review submission
  const handleAddReview = async (e: React.FormEvent) => {
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

      onSuccess(translations?.reviewAddedSuccess || 'Review added successfully!');
      onReviewAdded();
      
      // Reload the review to get the edit mode working
      const checkExistingReview = async () => {
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('companyId', '==', company.id),
          where('userId', '==', currentUser.uid)
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        
        if (!reviewsSnapshot.empty) {
          const reviewData = reviewsSnapshot.docs[0].data();
          const review = {
            id: reviewsSnapshot.docs[0].id,
            ...reviewData,
            createdAt: reviewData.createdAt?.toDate() || new Date(),
            updatedAt: reviewData.updatedAt?.toDate() || new Date(),
            companyReply: reviewData.companyReply ? {
              ...reviewData.companyReply,
              repliedAt: reviewData.companyReply.repliedAt?.toDate() || new Date()
            } : undefined
          } as Review;
          
          setUserReview(review);
        }
      };
      
      checkExistingReview();
      
    } catch (error: any) {
      console.error('Error adding review:', error);
      onError(translations?.failedToAddReview || 'Failed to add review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle edit review submission
  const handleEditReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !userReview) {
      onError(translations?.mustBeLoggedIn || 'You must be logged in to edit a review');
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

      // Update review in Firestore
      const reviewRef = doc(db, 'reviews', userReview.id);
      await updateDoc(reviewRef, {
        rating: overallRating,
        ratingDetails: formData.ratingDetails,
        title: formData.title.trim(),
        content: formData.content.trim(),
        isAnonymous: formData.isAnonymous,
        updatedAt: new Date()
      });

      // Update company's rating
      await updateCompanyRating();
      
      // Update local state
      setUserReview({
        ...userReview,
        rating: overallRating,
        ratingDetails: formData.ratingDetails,
        title: formData.title.trim(),
        content: formData.content.trim(),
        isAnonymous: formData.isAnonymous,
        updatedAt: new Date()
      });

      onSuccess(translations?.reviewUpdatedSuccess || 'Review updated successfully!');
      onReviewAdded();
    } catch (error: any) {
      console.error('Error updating review:', error);
      onError(translations?.failedToUpdateReview || 'Failed to update review. Please try again.');
    } finally {
      setLoading(false);
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

  // If user is not logged in
  if (!currentUser) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-8 text-center">
        <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {translations?.loginToReview || 'Please log in to write a review'}
        </h2>
        <p className="text-gray-600 mb-6">
          {translations?.loginToReviewDesc || 'You need to be logged in to share your experience with this company.'}
        </p>
      </div>
    );
  }
  
  // If the user has already written a review
  const isEditing = userReview !== null;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isEditing 
            ? (translations?.editReview || 'Edit Review') 
            : (translations?.writeReview || 'Write a Review')}
        </h2>
        <p className="text-gray-600">
          {isEditing
            ? (translations?.updateYourReview || 'Update your review of this company')
            : (translations?.shareExperienceWith?.replace('{company}', company.name) || 
               `Share your experience with ${company.name}`)}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={isEditing ? handleEditReview : handleAddReview} className="space-y-8">
        {/* User Info Display */}
        <div className="bg-gray-50 rounded-xl p-6">
          <div className="flex items-center space-x-3 rtl:space-x-reverse">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || ''}
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
                {isEditing 
                  ? (translations?.originalReview?.replace('{date}', userReview.createdAt.toLocaleDateString()) || 
                     `Original review: ${userReview.createdAt.toLocaleDateString()}`)
                  : (translations?.reviewingAs?.replace('{role}', currentUser?.role || 'user') || 
                     `Reviewing as: ${currentUser?.role || 'user'}`)}
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {translations?.rateYourExperience || 'Rate Your Experience'} *
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="mt-6 py-4 border-t border-b border-gray-200">
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
          <label className="block text-lg font-semibold text-gray-900 mb-2">
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
            {translations?.charactersLimit?.replace('{current}', formData.title.length.toString()).replace('{max}', '100') || 
             `${formData.title.length}/100 characters`}
          </p>
        </div>

        {/* Content */}
        <div>
          <label className="block text-lg font-semibold text-gray-900 mb-2">
            {translations?.yourReview || 'Your Review'} *
          </label>
          <textarea
            required
            rows={6}
            value={formData.content}
            onChange={(e) => handleInputChange('content', e.target.value)}
            placeholder={translations?.tellOthersExperience || 'Tell others about your experience with this company. What did you like? What could be improved?'}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 resize-none"
            maxLength={1000}
          />
          <p className="text-xs text-gray-500 mt-1">
            {translations?.charactersLimit?.replace('{current}', formData.content.length.toString()).replace('{max}', '1000') || 
             `${formData.content.length}/1000 characters`}
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

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={loading || !calculateAverageRating() || !formData.title.trim() || !formData.content.trim()}
            className="w-full sm:w-auto text-white py-4 px-8 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-lg hover:shadow-xl"
            style={{ backgroundColor: isEditing ? '#f97316' : '#194866' }}
            onMouseEnter={(e) => {
              if (!loading && calculateAverageRating() !== 0 && formData.title.trim() && formData.content.trim()) {
                e.target.style.backgroundColor = isEditing ? '#ea580c' : '#0f3147';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = isEditing ? '#f97316' : '#194866';
            }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                {isEditing ? <Edit className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                <span>
                  {isEditing 
                    ? (translations?.updateReview || 'Update Review')
                    : (translations?.submitReview || 'Submit Review')}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default WriteReviewTab;