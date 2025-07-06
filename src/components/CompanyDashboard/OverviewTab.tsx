import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Company } from '../../types/company';
import { Review } from '../../types/property';
import { ChevronRight, Star, MessageSquare, TrendingUp, TrendingDown, Reply } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCompanySlug } from '../../utils/urlUtils';
import { format, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';

interface OverviewTabProps {
  company: Company;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ company }) => {
  const { translations, language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [newReviewsCount, setNewReviewsCount] = useState(0);
  const [responseRate, setResponseRate] = useState(0);
  const [reviewsTrend, setReviewsTrend] = useState<'up' | 'down' | 'stable'>('stable');
  const [ratingTrend, setRatingTrend] = useState<'up' | 'down' | 'stable'>('stable');

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get all reviews for this company
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('companyId', '==', company.id),
          orderBy('createdAt', 'desc')
        );
        
        const reviewsSnapshot = await getDocs(reviewsQuery);
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
        
        setReviews(reviewsData);
        
        // Get recent reviews (last 5)
        setRecentReviews(reviewsData.slice(0, 5));
        
        // Calculate metrics
        const totalReviewCount = reviewsData.length;
        setTotalReviews(totalReviewCount);
        
        // Average rating
        if (totalReviewCount > 0) {
          const sumRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
          setAverageRating(Math.round((sumRating / totalReviewCount) * 10) / 10);
        }
        
        // New reviews this month
        const oneMonthAgo = subMonths(new Date(), 1);
        const newReviews = reviewsData.filter(review => review.createdAt >= oneMonthAgo);
        setNewReviewsCount(newReviews.length);
        
        // Response rate
        const reviewsWithReplies = reviewsData.filter(review => review.companyReply);
        if (totalReviewCount > 0) {
          setResponseRate(Math.round((reviewsWithReplies.length / totalReviewCount) * 100));
        }
        
        // Calculate trends
        // For new reviews trend, compare with previous month
        const twoMonthsAgo = subMonths(new Date(), 2);
        const reviewsLastMonth = reviewsData.filter(review => 
          review.createdAt >= oneMonthAgo
        ).length;
        
        const reviewsPreviousMonth = reviewsData.filter(review => 
          review.createdAt >= twoMonthsAgo && review.createdAt < oneMonthAgo
        ).length;
        
        if (reviewsLastMonth > reviewsPreviousMonth) {
          setReviewsTrend('up');
        } else if (reviewsLastMonth < reviewsPreviousMonth) {
          setReviewsTrend('down');
        } else {
          setReviewsTrend('stable');
        }
        
        // For rating trend, calculate average from this month and previous month
        const reviewsThisMonth = reviewsData.filter(review => review.createdAt >= oneMonthAgo);
        const reviewsBeforeThisMonth = reviewsData.filter(review => review.createdAt < oneMonthAgo);
        
        if (reviewsThisMonth.length > 0 && reviewsBeforeThisMonth.length > 0) {
          const avgRatingThisMonth = reviewsThisMonth.reduce((sum, review) => sum + review.rating, 0) / reviewsThisMonth.length;
          const avgRatingBeforeThisMonth = reviewsBeforeThisMonth.reduce((sum, review) => sum + review.rating, 0) / reviewsBeforeThisMonth.length;
          
          if (avgRatingThisMonth > avgRatingBeforeThisMonth) {
            setRatingTrend('up');
          } else if (avgRatingThisMonth < avgRatingBeforeThisMonth) {
            setRatingTrend('down');
          } else {
            setRatingTrend('stable');
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [company.id]);

  // Handle review click
  const handleReviewClick = (review: Review) => {
    const companySlug = getCompanySlug(company.name);
    navigate(`/company/${companySlug}/${company.id}/reviews?review=${review.id}`);
  };

  // Format date
  const formatDate = (date: Date) => {
    return format(date, 'PPP', { locale: language === 'ar' ? ar : undefined });
  };

  // Get trend icon and color
  const getTrendIcon = (trend: 'up' | 'down' | 'stable', isRating: boolean = false) => {
    if (trend === 'up') {
      return (
        <div className={`flex items-center ${isRating ? 'text-green-600' : 'text-blue-600'}`}>
          <TrendingUp className="h-4 w-4 mr-1" />
          <span className="text-xs font-medium">{translations?.increase || 'Increase'}</span>
        </div>
      );
    } else if (trend === 'down') {
      return (
        <div className={`flex items-center ${isRating ? (averageRating < 3 ? 'text-red-600' : 'text-orange-600') : 'text-gray-600'}`}>
          <TrendingDown className="h-4 w-4 mr-1" />
          <span className="text-xs font-medium">{translations?.decrease || 'Decrease'}</span>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Reviews */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {translations?.totalReviews || 'Total Reviews'}
            </h3>
            <span className="text-3xl font-bold text-gray-900 mb-2">
              {totalReviews}
            </span>
            {reviewsTrend !== 'stable' && (
              <div className="mt-2">
                {getTrendIcon(reviewsTrend)}
              </div>
            )}
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {translations?.averageRating || 'Average Rating'}
            </h3>
            <div className="flex items-center mb-2">
              <span className="text-3xl font-bold text-gray-900 mr-2">
                {averageRating.toFixed(1)}
              </span>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${i < Math.round(averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                  />
                ))}
              </div>
            </div>
            {ratingTrend !== 'stable' && (
              <div className="mt-2">
                {getTrendIcon(ratingTrend, true)}
              </div>
            )}
          </div>
        </div>

        {/* New Reviews This Month */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {translations?.newReviewsThisMonth || 'New Reviews This Month'}
            </h3>
            <span className="text-3xl font-bold text-gray-900">
              {newReviewsCount}
            </span>
          </div>
        </div>

        {/* Response Rate */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Reply className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {translations?.responseRate || 'Response Rate'}
            </h3>
            <span className="text-3xl font-bold text-gray-900">
              {responseRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Latest Reviews Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            {translations?.latestReviews || 'Latest Reviews'}
          </h3>
          
          <button 
            onClick={() => navigate(`/company/${getCompanySlug(company.name)}/${company.id}/reviews`)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
          >
            {translations?.viewAll || 'View All'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
        
        {recentReviews.length > 0 ? (
          <div className="space-y-4">
            {recentReviews.map(review => (
              <div 
                key={review.id} 
                className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
                onClick={() => handleReviewClick(review)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium text-gray-900">{review.userName}</span>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3 h-3 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{formatDate(review.createdAt)}</span>
                    </div>
                  </div>
                  
                  {!review.companyReply && (
                    <div className="bg-orange-100 text-orange-800 px-2 py-1 text-xs rounded-full">
                      {translations?.needsResponse || 'Needs Response'}
                    </div>
                  )}
                </div>
                
                <h4 className="font-medium text-gray-800 mb-1">{review.title}</h4>
                <p className="text-gray-600 text-sm line-clamp-2">{review.content}</p>
                
                {review.companyReply && (
                  <div className="mt-2 pl-4 border-l-2 border-blue-200">
                    <p className="text-gray-600 text-xs italic line-clamp-1">
                      <span className="text-blue-600 font-medium">{translations?.yourReply || 'Your reply'}:</span> {review.companyReply.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-xl">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {translations?.noReviewsYet || 'No reviews yet'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {translations?.reviewsWillAppearHere || 'Reviews will appear here once customers leave feedback.'}
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity Coming Soon */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {translations?.recentActivity || 'Recent Activity'} 
        </h3>
        <p className="text-gray-500">
          {translations?.comingSoon || 'Coming Soon'}
        </p>
      </div>
    </div>
  );
};

export default OverviewTab;