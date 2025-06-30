import React, { useState, useEffect, useRef } from 'react';
import { Search, Star, Filter, MapPin, Calendar, Eye, Building2, Users, MessageSquare, ArrowRight, ArrowLeft } from 'lucide-react';
import { collection, getDocs, query, orderBy, where, limit, startAfter, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { Review } from '../types/property';
import { Category, egyptianGovernorates } from '../types/company';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [recentReviews, setRecentReviews] = useState<(Review & { companyName: string, companyLogo?: string })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topRatedCompanies, setTopRatedCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [slidesPerView, setSlidesPerView] = useState(4);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  
  // Search suggestions state
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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

  // Categories data with real data
  const categoryOptions = [
    { id: 'all', name: translations?.allCategories || 'All Categories', icon: Building2 },
    ...(categories.map(cat => ({ 
      id: cat.id, 
      name: language === 'ar' ? (cat.nameAr || cat.name) : cat.name,
      description: language === 'ar' ? (cat.descriptionAr || cat.description) : cat.description,
      iconUrl: cat.iconUrl || null,
    })))
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

  // Fetch search suggestions
  const fetchSearchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSearchSuggestions([]);
      return;
    }

    try {
      setSuggestionsLoading(true);
      
      // Query companies that match the search term
      const lowercaseQuery = query.toLowerCase();
      const companiesRef = collection(db, 'companies');
      const companiesSnapshot = await getDocs(companiesRef);
      
      // Client-side filtering since Firestore doesn't support text search
      const matchingCompanies = companiesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          totalRating: doc.data().totalRating || doc.data().rating || 0,
          totalReviews: doc.data().totalReviews || 0
        }))
        .filter(company => 
          company.name.toLowerCase().includes(lowercaseQuery)
        )
        .slice(0, 5); // Limit to 5 suggestions
      
      // Get additional data for each company
      const companiesWithDetails = await Promise.all(
        matchingCompanies.map(async (company) => {
          // Get category
          let categoryName = "";
          if (company.categoryId) {
            const categoryDoc = await getDoc(doc(db, 'categories', company.categoryId));
            if (categoryDoc.exists()) {
              const categoryData = categoryDoc.data();
              categoryName = language === 'ar' ? (categoryData.nameAr || categoryData.name) : categoryData.name;
            }
          }
          
          return {
            ...company,
            categoryName
          };
        })
      );
      
      setSearchSuggestions(companiesWithDetails);
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      setSearchSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Debounce search suggestions
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchSearchSuggestions(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, language]);

  // Handle clicks outside search suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = () => {
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(searchQuery, selectedCategory);
    } else if (onNavigate) {
      // Dispatch event to navigate with search params
      const event = new CustomEvent('navigateToSearch', {
        detail: { query: searchQuery, category: selectedCategory }
      });
      window.dispatchEvent(event);
    }
  };

  const handleShareExperience = () => {
    if (onNavigate) {
      onNavigate('categories');
    }
  };

  // Handle category click
  const handleCategoryClick = (categoryId: string) => {
    if (onNavigate) {
      // Dispatch event to navigate with search params
      const event = new CustomEvent('navigateToSearch', {
        detail: { query: '', category: categoryId }
      });
      window.dispatchEvent(event);
    }
  };

  // Handle company click
  const handleCompanyClick = (companyId: string) => {
    // Dispatch event to navigate to company profile
    const event = new CustomEvent('navigateToCompanyProfile', {
      detail: { companyId }
    });
    window.dispatchEvent(event);
  };

  // Handle suggestion click
  const handleSuggestionClick = (companyId: string) => {
    setShowSuggestions(false);
    handleCompanyClick(companyId);
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
                <div className="md:col-span-5 relative">
                  <Search className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={translations?.searchPlaceholder || 'Search companies...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full pl-12 rtl:pr-12 rtl:pl-6 pr-6 py-4 text-gray-800 text-lg rounded-xl border border-gray-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white"
                    style={{ 
                      focusBorderColor: '#EE183F',
                      focusRingColor: '#EE183F'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#EE183F';
                      e.target.style.boxShadow = `0 0 0 3px rgba(238, 24, 63, 0.1)`;
                      setShowSuggestions(true);
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  
                  {/* Search Suggestions Dropdown */}
                  {showSuggestions && searchQuery.trim() !== '' && (
                    <div 
                      ref={suggestionsRef}
                      className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                    >
                      {suggestionsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-2"></div>
                          <span className="text-gray-500 text-sm">{translations?.loading || 'Loading...'}</span>
                        </div>
                      ) : searchSuggestions.length > 0 ? (
                        <div>
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                            {translations?.companies || 'Companies'}
                          </div>
                          {searchSuggestions.map(company => (
                            <div 
                              key={company.id}
                              className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center space-x-3 rtl:space-x-reverse"
                              onClick={() => handleSuggestionClick(company.id)}
                            >
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                                {company.logoUrl ? (
                                  <img 
                                    src={company.logoUrl} 
                                    alt={company.name}
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  <Building2 className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {company.name}
                                </div>
                                <div className="flex items-center text-xs text-gray-500 space-x-2 rtl:space-x-reverse">
                                  <span>{company.categoryName}</span>
                                  {company.totalRating > 0 && (
                                    <div className="flex items-center space-x-1 rtl:space-x-reverse">
                                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                      <span>{company.totalRating.toFixed(1)}</span>
                                      <span>({company.totalReviews})</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-gray-400" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500">
                          {translations?.noCompaniesFound || 'No companies found'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="md:col-span-4">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-6 py-4 text-gray-800 text-lg rounded-xl border border-gray-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white appearance-none"
                    style={{ 
                      focusBorderColor: '#EE183F',
                      focusRingColor: '#EE183F'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#EE183F';
                      e.target.style.boxShadow = `0 0 0 3px rgba(238, 24, 63, 0.1)`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-3">
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
                  onClick={() => handleCompanyClick(company.id)}
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
                      <div className="flex items-center space-x-1 rtl:space-x-reverse">
                        <Star className="w-5 h-5 text-yellow-400 fill-current" />
                        <span className="font-semibold text-gray-900">{company.totalRating?.toFixed(1) || '0.0'}</span>
                      </div>
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

export default Hero;