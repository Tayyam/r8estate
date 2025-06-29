import React, { useState, useEffect } from 'react';
import { Search, Star, Building2, Users, MessageSquare, Calendar, ChevronRight } from 'lucide-react';
import { collection, getDocs, query, orderBy, where, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { Review } from '../types/property';

const Hero = () => {
  const { translations } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [recentReviews, setRecentReviews] = useState<(Review & { companyName: string, companyLogo?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Categories data
  const categories = [
    { id: 'all', name: translations?.allCategories || 'All Categories', icon: Building2 },
    { id: 'developers', name: translations?.developers || 'Developers', icon: Building2 },
    { id: 'brokers', name: translations?.brokers || 'Brokers', icon: Users },
    { id: 'consultants', name: translations?.consultants || 'Consultants', icon: MessageSquare },
  ];

  // Top rated companies data
  const topCompanies = [
    {
      id: 1,
      name: 'Palm Hills Development',
      rating: 4.8,
      reviews: 245,
      category: 'Developer',
      image: 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=300&h=200',
    },
    {
      id: 2,
      name: 'Cairo Real Estate',
      rating: 4.7,
      reviews: 189,
      category: 'Broker',
      image: 'https://images.pexels.com/photos/1370704/pexels-photo-1370704.jpeg?auto=compress&cs=tinysrgb&w=300&h=200',
    },
    {
      id: 3,
      name: 'Emaar Misr',
      rating: 4.9,
      reviews: 312,
      category: 'Developer',
      image: 'https://images.pexels.com/photos/1546168/pexels-photo-1546168.jpeg?auto=compress&cs=tinysrgb&w=300&h=200',
    },
  ];

  // Fetch recent high-rated reviews (3 stars or more)
  useEffect(() => {
    const fetchRecentReviews = async () => {
      setLoading(true);
      try {
        // Create a query to get reviews with rating >= 3, ordered by date
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('rating', '>=', 3),
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

  const handleSearch = () => {
    console.log('Search:', searchQuery, 'Category:', selectedCategory);
  };

  const handleShareExperience = () => {
    console.log('Share experience clicked');
  };

  // Format date in a readable way
  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section style={{ backgroundColor: '#EFF5FF' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: '#194866' }}>
              {translations?.heroTitle || 'Egypt\'s Premier Real Estate Review Platform'}
            </h1>
            <p className="text-xl md:text-2xl mb-12" style={{ color: '#194866', opacity: 0.8 }}>
              {translations?.heroSubtitle || 'Discover and review the best properties and developers in Egypt. Real reviews from real customers'}
            </p>

            {/* Search Section */}
            <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <input
                    type="text"
                    placeholder={translations?.searchPlaceholder || 'Search for a company...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-6 py-4 text-gray-800 text-lg rounded-xl border border-gray-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#194866';
                      e.target.style.boxShadow = `0 0 0 3px rgba(25, 72, 102, 0.1)`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div className="md:col-span-4">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-6 py-4 text-gray-800 text-lg rounded-xl border border-gray-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200"
                    style={{ 
                      focusBorderColor: '#194866',
                      focusRingColor: '#194866'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#194866';
                      e.target.style.boxShadow = `0 0 0 3px rgba(25, 72, 102, 0.1)`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <button
                    onClick={handleSearch}
                    className="w-full text-white px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-lg hover:shadow-xl"
                    style={{ backgroundColor: '#EE183F' }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#c71535';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#EE183F';
                    }}
                  >
                    <Search className="w-5 h-5" />
                    <span>{translations?.search || 'Search'}</span>
                  </button>
                </div>
              </div>

              {/* Share Experience CTA */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-gray-600 text-lg mb-4">
                  {translations?.shareExperiencePrompt || 'Just had an experience with a company?'}
                </p>
                <button
                  onClick={handleShareExperience}
                  className="text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  style={{ backgroundColor: '#EE183F' }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#c71535';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#EE183F';
                  }}
                >
                  {translations?.shareWithUs || 'Share it with us'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by Category Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            {translations?.browseByCategory || 'Browse by Category'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.slice(1).map((category) => {
              const IconComponent = category.icon;
              return (
                <div
                  key={category.id}
                  className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 text-center transition-all duration-300 hover:scale-105 cursor-pointer"
                  style={{ 
                    '--hover-bg': '#EFF5FF',
                    '--hover-border': '#194866'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#EFF5FF';
                    e.target.style.borderColor = '#194866';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f9fafb';
                    e.target.style.borderColor = '#e5e7eb';
                  }}
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(25, 72, 102, 0.1)' }}>
                    <IconComponent className="w-8 h-8" style={{ color: '#194866' }} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{category.name}</h3>
                  <div className="flex items-center justify-center font-medium" style={{ color: '#194866' }}>
                    <span>{translations?.explore || 'Explore'}</span>
                    <ChevronRight className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Top Rated Companies Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            {translations?.topRatedCompanies || 'Top Rated Companies'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {topCompanies.map((company) => (
              <div
                key={company.id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden"
              >
                <img
                  src={company.image}
                  alt={company.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 text-sm font-medium rounded-full" style={{ backgroundColor: 'rgba(25, 72, 102, 0.1)', color: '#194866' }}>
                      {company.category}
                    </span>
                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                      <Star className="w-5 h-5 text-yellow-400 fill-current" />
                      <span className="font-semibold text-gray-900">{company.rating}</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{company.name}</h3>
                  <p className="text-gray-600">
                    {company.reviews} {translations?.reviews || 'reviews'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Reviews Section */}
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
                    <div className="w-12 h-12 rounded-full bg-white shadow overflow-hidden flex items-center justify-center border border-gray-200">
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
                      <h3 className="font-bold text-gray-900">{review.companyName}</h3>
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
                    <span>{review.userName}</span>
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
    </div>
  );
};

export default Hero;