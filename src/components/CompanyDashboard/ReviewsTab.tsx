import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import TrustpilotStars from '../UI/TrustpilotStars';
import { useLanguage } from '../../contexts/LanguageContext';
import { Company } from '../../types/company';
import { Review } from '../../types/property';
import { Star, Filter, ArrowDown, ArrowUp, Reply, Eye, X, Edit, Loader, AlertCircle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { getCompanySlug } from '../../utils/urlUtils';
import ReplyModal from '../CompanyProfile/ReplyModal';

interface ReviewsTabProps {
  company: Company;
}

interface ReviewFilters {
  rating: 'all' | 1 | 2 | 3 | 4 | 5;
  responseStatus: 'all' | 'responded' | 'not-responded';
  sortBy: 'newest' | 'oldest' | 'highest-rating' | 'lowest-rating';
}

const ReviewsTab: React.FC<ReviewsTabProps> = ({ company }) => {
  const { translations, language } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [filters, setFilters] = useState<ReviewFilters>({
    rating: 'all',
    responseStatus: 'all',
    sortBy: 'newest'
  });
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showReplyModal, setShowReplyModal] = useState(false);

  // Load reviews
  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        
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
        setFilteredReviews(reviewsData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading reviews:', error);
        setLoading(false);
      }
    };
    
    loadReviews();
  }, [company.id]);

  // Apply filters when filters change
  useEffect(() => {
    if (reviews.length === 0) return;
    
    let result = [...reviews];
    
    // Apply rating filter
    if (filters.rating !== 'all') {
      result = result.filter(review => review.rating === filters.rating);
    }
    
    // Apply response status filter
    if (filters.responseStatus === 'responded') {
      result = result.filter(review => review.companyReply);
    } else if (filters.responseStatus === 'not-responded') {
      result = result.filter(review => !review.companyReply);
    }
    
    // Apply sorting
    result = result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'highest-rating':
          return b.rating - a.rating;
        case 'lowest-rating':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });
    
    setFilteredReviews(result);
  }, [filters, reviews]);

  // Handle filter changes
  const handleFilterChange = (filter: keyof ReviewFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filter]: value
    }));
  };

  // Handle reply to review
  const handleReplyClick = (review: Review) => {
    setSelectedReview(review);
    setShowReplyModal(true);
  };

  // Handle reply success
  const handleReplySuccess = async () => {
    try {
      // Reload reviews to get updated data
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
      setFilteredReviews(reviewsData);
      setShowReplyModal(false);
      setSelectedReview(null);
    } catch (error) {
      console.error('Error reloading reviews after reply:', error);
    }
  };

  // Handle view review in public profile
  const handleViewReviewClick = (review: Review) => {
    const companySlug = getCompanySlug(company.name);
    navigate(`/company/${companySlug}/${company.id}/reviews?review=${review.id}`);
  };

  // Format date
  const formatDate = (date: Date) => {
    return format(date, 'PPP', { locale: language === 'ar' ? ar : undefined });
  };


  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center">
            <Filter className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium text-gray-700 mr-2">
              {translations?.filters || 'Filters'}:
            </span>
          </div>
          
          {/* Rating Filter */}
          <div>
            <select
              value={filters.rating as string}
              onChange={(e) => handleFilterChange('rating', e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="text-sm border-gray-300 rounded-md"
            >
              <option value="all">{translations?.allRatings || 'All Ratings'}</option>
              <option value="5">★★★★★ (5)</option>
              <option value="4">★★★★☆ (4)</option>
              <option value="3">★★★☆☆ (3)</option>
              <option value="2">★★☆☆☆ (2)</option>
              <option value="1">★☆☆☆☆ (1)</option>
            </select>
          </div>
          
          {/* Response Status Filter */}
          <div>
            <select
              value={filters.responseStatus}
              onChange={(e) => handleFilterChange('responseStatus', e.target.value)}
              className="text-sm border-gray-300 rounded-md"
            >
              <option value="all">{translations?.allResponses || 'All Responses'}</option>
              <option value="responded">{translations?.responded || 'Responded'}</option>
              <option value="not-responded">{translations?.notResponded || 'Not Responded'}</option>
            </select>
          </div>
          
          {/* Sort By */}
          <div className="ml-auto">
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="text-sm border-gray-300 rounded-md"
            >
              <option value="newest">{translations?.newest || 'Newest'}</option>
              <option value="oldest">{translations?.oldest || 'Oldest'}</option>
              <option value="highest-rating">{translations?.highestRating || 'Highest Rating'}</option>
              <option value="lowest-rating">{translations?.lowestRating || 'Lowest Rating'}</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <div className="space-y-6">
          {filteredReviews.map(review => (
            <div key={review.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6">
                {/* Review Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center mb-1">
                      <h3 className="font-medium text-gray-900 mr-3">{review.userName}</h3>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
                    
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    {!review.companyReply && (
                      <button
                        onClick={() => handleReplyClick(review)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Reply className="h-4 w-4 mr-1" />
                        {translations?.reply || 'Reply'}
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleViewReviewClick(review)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {translations?.view || 'View'}
                    </button>
                  </div>
                </div>
                
                {/* Review Content */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-800 mb-2">{review.title}</h4>
                  <p className="text-gray-600">{review.content}</p>
                </div>
                
                {/* Company Reply */}
                {review.companyReply && (
                  <div className="bg-blue-50 rounded-lg p-4 mt-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <Reply className="h-4 w-4 text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-blue-800">
                            {translations?.companyResponse || 'Company Response'}
                          </span>
                          <span className="text-xs text-blue-600 ml-2">
                            {formatDate(review.companyReply.repliedAt)}
                          </span>
                        </div>
                        <TrustpilotStars rating={review.rating} size="small" />
                        <p className="text-gray-700 mt-2">{review.companyReply.content}</p>
                      </div>
                      
                      {/* Edit Reply - Future Feature */}
                      {/* <button className="text-blue-600 hover:text-blue-800">
                        <Edit className="h-4 w-4" />
                      </button> */}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {translations?.noReviewsFound || 'No reviews found'}
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            {translations?.noReviewsMatchFilters || 'No reviews match your selected filters. Try changing your filters or check back later for new reviews.'}
          </p>
        </div>
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
          onError={(message) => console.error(message)}
        />
      )}
    </div>
  );
};

export default ReviewsTab;