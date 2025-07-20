import React from 'react';
import { Star } from 'lucide-react';
import TrustpilotStars from '../UI/TrustpilotStars';
import { useLanguage } from '../../contexts/LanguageContext';
import { Review } from '../../types/property';

interface ReviewStatsProps {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
}

const ReviewStats: React.FC<ReviewStatsProps> = ({
  reviews,
  averageRating,
  totalReviews
}) => {
  const { translations } = useLanguage();

  // Group reviews by rating for distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(review => review.rating === rating).length,
    percentage: reviews.length > 0 ? (reviews.filter(review => review.rating === rating).length / reviews.length) * 100 : 0
  }));

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Average Rating */}
        <div className="text-center lg:text-left">
          <div className="flex flex-col items-center lg:items-start space-y-4">
            <div className="mb-4 lg:mb-0">
              <div className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
                {averageRating > 0 ? averageRating.toFixed(1) : '0.0'}
              </div>
              
              {/* Trustpilot Stars - Centered and properly sized */}
              <div className="flex items-center justify-center lg:justify-start mb-3">
                <TrustpilotStars rating={averageRating} size="medium" />
              </div>
              
              <p className="text-gray-600">
                {translations?.basedOnReviews?.replace('{count}', totalReviews.toString()) || 
                 `Based on ${totalReviews} review${totalReviews > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="space-y-3 mt-6 lg:mt-0">
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
  );
};

export default ReviewStats;