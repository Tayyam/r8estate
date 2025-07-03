import React, { useState, useEffect } from 'react';
import { Star, Calendar, Building2, Users, MessageSquare, ArrowRight, ArrowLeft } from 'lucide-react';
import { collection, getDocs, query, orderBy, where, limit, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Review } from '../types/property';
import { Category } from '../types/company';
import { getCompanySlug } from '../utils/urlUtils';
import GoogleOneTap from './GoogleOneTap';
import HeroSearchBar from './HeroSearchBar';

// Import Swiper components
import { Swiper, SwiperSlide } from 'swiper/react';
// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';

interface HeroProps {
  onNavigate?: (page: string) => void;
  onCategorySelect?: (categoryId: string) => void;
  onSearch?: (query: string, category: string) => void;
}

const Hero: React.FC<HeroProps> = ({ onNavigate, onCategorySelect, onSearch }) => {
  const { translations, language } = useLanguage();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [recentReviews, setRecentReviews] = useState<(Review & { companyName: string, companyLogo?: string })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topRatedCompanies, setTopRatedCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [slidesPerView, setSlidesPerView] = useState(4);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  // Update slides per view based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setSlidesPerView(1);
      } else if (window.innerWidth < 768) {
        setSlidesPerView(2);
      } else if (window.innerWidth < 1024) {
        setSlidesPerView(3);
      } else {
        setSlidesPerView(4);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load categories from Firestore
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoryLoading(true);
        const categoriesQuery = query(
          collection(db, 'categories'),
          orderBy('name'),
          limit(8)
        );
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as Category[];
        
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading categories:', error);
      } finally {
        setCategoryLoading(false);
      }
    };
    
    loadCategories();
  }, []);

  // Fetch top-rated companies from Firestore
  useEffect(() => {
    const fetchTopRatedCompanies = async () => {
      setCompaniesLoading(true);
      setCompaniesError(null);
      
      try {
        // First try to get companies with ratings
        let companiesQuery = query(
          collection(db, 'companies'),
          orderBy('rating', 'desc'), // Order by rating descending
          limit(3) // Limit to 3 companies
        );
        
        let companiesSnapshot = await getDocs(companiesQuery);
        
        // If no companies found with this query, try getting any companies
        if (companiesSnapshot.empty) {
          companiesQuery = query(
            collection(db, 'companies'),
            orderBy('createdAt', 'desc'), // Order by creation date instead
            limit(3) // Still limit to 3 companies
          );
          
          companiesSnapshot = await getDocs(companiesQuery);
        }
        
        if (companiesSnapshot.empty) {
          // Still no companies found
          setTopRatedCompanies([]);
          setCompaniesLoading(false);
          return;
        }
        
        const companiesData = companiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          // Ensure totalRating has a value
          totalRating: doc.data().totalRating || doc.data().rating || 0,
          totalReviews: doc.data().totalReviews || 0
        }));
        
        // Fetch category info for each company
        const companiesWithCategories = await Promise.all(
          companiesData.map(async (company) => {
            let categoryName = "Unknown";
            
            if (company.categoryId) {
              try {
                const categoryDoc = await getDoc(doc(db, 'categories', company.categoryId));
                if (categoryDoc.exists()) {
                  const categoryData = categoryDoc.data();
                  categoryName = language === 'ar' ? (categoryData.nameAr || categoryData.name) : categoryData.name;
                }
              } catch (err) {
                console.error('Error fetching category for company:', err);
                // Continue with "Unknown" category
              }
            }
            
            return {
              ...company,
              categoryName
            };
          })
        );
        
        setTopRatedCompanies(companiesWithCategories);
      } catch (error) {
        console.error('Error fetching top rated companies:', error);
        setCompaniesError('Failed to load companies');
        setTopRatedCompanies([]);
      } finally {
        setCompaniesLoading(false);
      }
    };
    
    fetchTopRatedCompanies();
  }, [language]);

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

  // Handle category click
  const handleCategoryClick = (categoryId: string) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    }
    
    if (onNavigate) {
      // Dispatch event to navigate with search params
      const event = new CustomEvent('navigateToCompaniesWithCategory', {
        detail: { categoryId }
      });
      window.dispatchEvent(event);
    } else {
      navigate(`/categories/${categoryId}`);
    }
  };

  // Handle company click
  const handleCompanyClick = (companyId: string, companyName: string) => {
    // Format company name for URL
    const companySlug = getCompanySlug(companyName);
    
    if (onNavigate) {
      // Dispatch event to navigate to company profile
      const event = new CustomEvent('navigateToCompanyProfile', {
        detail: { companyId, companyName }
      });
      window.dispatchEvent(event);
    } else {
      navigate(`/company/${companySlug}/${companyId}/overview`);
    }
  };

  // Format date in a readable way
  const formatDate = (date: Date) => {
    return date.toLocaleDateString();
  };

  // Get a color for category based on index
  const getCategoryColor = (index: number) => {
    const colors = [
      { bg: 'rgba(25, 72, 102, 0.1)', text: '#194866' },
      { bg: 'rgba(238, 24, 63, 0.1)', text: '#EE183F' },
      { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
      { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6' },
      { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B' },
      { bg: 'rgba(6, 182, 212, 0.1)', text: '#06B6D4' },
      { bg: 'rgba(236, 72, 153, 0.1)', text: '#EC4899' },
      { bg: 'rgba(55, 65, 81, 0.1)', text: '#374151' }
    ];
    
    return colors[index % colors.length];
  };

  // Handle search callback
  const handleSearch = (query: string, category: string) => {
    if (onSearch) {
      onSearch(query, category);
    } else {
      navigate(`/search?q=${encodeURIComponent(query || '')}&category=${category || 'all'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show GoogleOneTap if user is not logged in */}
      {!currentUser && <GoogleOneTap />}
      
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

            {/* Search Bar Component */}
            <HeroSearchBar onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {/* Browse by Category Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            {translations?.browseByCategory || 'Browse by Category'}
          </h2>
          
          {categoryLoading ? (
            <div className="flex justify-center items-center h-60">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : categories.length > 0 ? (
            <div className="relative categories-slider px-10">
              <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={20}
                slidesPerView={slidesPerView}
                navigation={{
                  nextEl: '.swiper-button-next',
                  prevEl: '.swiper-button-prev',
                }}
                pagination={{ 
                  clickable: true,
                  el: '.swiper-pagination'
                }}
                autoplay={{
                  delay: 5000,
                  disableOnInteraction: false,
                }}
                className="pb-12"
              >
                {categories.map((category, index) => {
                  const color = getCategoryColor(index);
                  return (
                    <SwiperSlide key={category.id}>
                      <div
                        className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-8 text-center transition-all duration-300 hover:scale-105 cursor-pointer h-full"
                        style={{ 
                          '--hover-bg': color.bg,
                          '--hover-border': color.text
                        }}
                        onClick={() => handleCategoryClick(category.id)}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = color.bg;
                          e.target.style.borderColor = color.text;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#f9fafb';
                          e.target.style.borderColor = '#e5e7eb';
                        }}
                      >
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: color.bg }}>
                          {category.iconUrl ? (
                            <img 
                              src={category.iconUrl} 
                              alt={category.name}
                              className="w-8 h-8" 
                            />
                          ) : (
                            <Building2 className="w-8 h-8" style={{ color: color.text }} />
                          )}
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">
                          {language === 'ar' ? (category.nameAr || category.name) : category.name}
                        </h3>
                        {category.description && (
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {language === 'ar' ? (category.descriptionAr || category.description) : category.description}
                          </p>
                        )}
                        <div className="flex items-center justify-center font-medium" style={{ color: color.text }}>
                          <span>{translations?.explore || 'Explore'}</span>
                          <ArrowRight className="w-4 h-4 ml-2 rtl:mr-2 rtl:ml-0" />
                        </div>
                      </div>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
              
              {/* Custom navigation buttons */}
              <button className="swiper-button-prev absolute top-1/2 transform -translate-y-1/2 left-0 z-10 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center focus:outline-none">
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <button className="swiper-button-next absolute top-1/2 transform -translate-y-1/2 right-0 z-10 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center focus:outline-none">
                <ArrowRight className="w-5 h-5 text-gray-700" />
              </button>
              
              {/* Custom pagination */}
              <div className="swiper-pagination bottom-0 !relative"></div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {translations?.noCategoriesFound || 'No categories found'}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Top Rated Companies Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            {translations?.topRatedCompanies || 'Top Rated Companies'}
          </h2>

          {companiesLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : companiesError ? (
            <div className="text-center py-12">
              <p className="text-red-500">{companiesError}</p>
            </div>
          ) : topRatedCompanies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {topRatedCompanies.map((company) => (
                <div
                  key={company.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden cursor-pointer"
                  onClick={() => handleCompanyClick(company.id, company.name)}
                >
                  {/* Company Image - Try logo first, then cover image, then fallback */}
                  <div className="w-full h-48 overflow-hidden">
                    {company.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt={company.name}
                        className="w-full h-full object-contain p-4 bg-gray-50"
                      />
                    ) : company.coverImageUrl ? (
                      <img
                        src={company.coverImageUrl}
                        alt={company.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center">
                        <Building2 className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 text-sm font-medium rounded-full" style={{ backgroundColor: 'rgba(25, 72, 102, 0.1)', color: '#194866' }}>
                        {company.categoryName}
                      </span>
                      
                      {/* Rating Badge with TrustPilot-like color gradient */}
                      {company.totalRating > 0 && (
                        <div className={`flex items-center space-x-1 rtl:space-x-reverse px-3 py-1 rounded-lg ${getRatingColorClass(company.totalRating)}`}>
                          <Star className="w-5 h-5 fill-current" />
                          <span className="font-semibold">{company.totalRating?.toFixed(1) || '0.0'}</span>
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{company.name}</h3>
                    <p className="text-gray-600">
                      {company.totalReviews || 0} {translations?.reviews || 'reviews'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500">
                {translations?.noCompaniesFound || 'No top rated companies found'}
              </p>
            </div>
          )}
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
                    <div 
                      className="w-12 h-12 rounded-full bg-white shadow overflow-hidden flex items-center justify-center border border-gray-200 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompanyClick(review.companyId, review.companyName);
                      }}
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
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCompanyClick(review.companyId, review.companyName);
                        }}
                      >
                        {review.companyName}
                      </h3>
                      <div className="flex items-center">
                        {/* Rating with TrustPilot-like color */}
                        <div className={`flex items-center ${getRatingColorClass(review.rating)}`}>
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
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

      {/* Custom styles for swiper navigation */}
      <style jsx global>{`
        .swiper-button-next::after,
        .swiper-button-prev::after {
          display: none;
        }
        
        .swiper-pagination-bullet {
          width: 10px;
          height: 10px;
          background-color: #194866;
          opacity: 0.5;
        }
        
        .swiper-pagination-bullet-active {
          opacity: 1;
          background-color: #194866;
        }
        
        @media (max-width: 640px) {
          .categories-slider {
            padding-left: 0;
            padding-right: 0;
          }
        }
      `}</style>
    </div>
  );
};

// Function to get rating color class based on rating value (TrustPilot style)
export const getRatingColorClass = (rating: number) => {
  if (rating >= 4.5) return 'text-green-600'; // Excellent (dark green)
  if (rating >= 4) return 'text-green-500';   // Great (green)
  if (rating >= 3.5) return 'text-green-400'; // Good (light green)
  if (rating >= 3) return 'text-yellow-500';  // Average (yellow)
  if (rating >= 2) return 'text-orange-500';  // Poor (orange)
  return 'text-red-500';                      // Bad (red)
};

export default Hero;