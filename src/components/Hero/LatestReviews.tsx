import React, { useState, useEffect } from 'react';
import { Calendar, User, Star, Building2 } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Review } from '../../types/property';

const LatestReviews: React.FC = () => {
  const { translations, language } = useLanguage();
  const [recentReviews, setRecentReviews] = useState<(Review & { companyName: string, companyLogo?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch recent high-rated reviews
  useEffect(() => {
    const fetchRecentReviews = async () => {
      setLoading(true);
      try {
        // Create a query to get reviews with rating >= 3, ordered by date
        const reviewsQuery = query(
          collection(db, 'reviews'),
          orderBy('rating', 'desc'),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        
        // Get the reviews
        const reviewsSnapshot = await getDocs(reviewsQuery);
        const reviewsData = reviewsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Review[];
        
        // Get company names for each review
        const reviewsWithCompanyNames = await Promise.all(
          reviewsData.map(async (review) => {
            // Get company document directly using the document ID
            const companyDoc = await getDoc(doc(db, 'companies', review.companyId));
            
            let companyName = "Unknown Company";
            let companyLogo = undefined;
            
            if (companyDoc.exists()) {
              const companyData = companyDoc.data();
              companyName = companyData.name || "Unknown Company";
              companyLogo = companyData.logoUrl || undefined;
            }
            
            return {
              ...review,
              companyName,
              companyLogo
            };
          })
        );
        
        setRecentReviews(reviewsWithCompanyNames);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        // Fallback to empty array if error occurs
        setRecentReviews([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentReviews();
  }, []);

  // Format date in a readable way
  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
          {translations?.latestReviews || 'Latest Reviews'}
        </h2>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        ) : recentReviews.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {recentReviews.map((review) => (
              <div
                key={review.id}
                className="bg-gray-50 rounded-2xl p-8 border-2 border-gray-200 transition-all duration-300"
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#194866';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                <div className="flex items-center space-x-3 rtl:space-x-reverse mb-4">
                  {/* Company Logo */}
                  <div 
                    className="w-12 h-12 rounded-full bg-white shadow overflow-hidden flex items-center justify-center border border-gray-200 cursor-pointer"
                  >
                    {review.companyLogo ? (
                      <img 
                        src={review.companyLogo} 
                        alt={review.companyName}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <Building2 className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  
                  <div>
                    <h3 
                      className="font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      {review.companyName}
                    </h3>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <h4 className="font-medium text-gray-800 mb-3">{review.title}</h4>
                <p className="text-gray-700 mb-6 leading-relaxed line-clamp-3">
                  {review.content}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{review.isAnonymous ? (translations?.anonymous || 'Anonymous') : review.userName}</span>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(review.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {translations?.noReviewsAvailable || 'No reviews available at the moment.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default LatestReviews;