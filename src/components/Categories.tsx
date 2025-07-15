import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, ChevronRight, Building2, Users, ChevronDown, ChevronUp, Star, ArrowLeft, ArrowRight } from 'lucide-react';
import { collection, getDocs, query, orderBy, where, doc, getDoc } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { Category } from '../types/company';
import { getCompanySlug } from '../utils/urlUtils';

interface CategoriesProps {
  onNavigateToProfile?: (companyId: string, companyName: string) => void;
}

// Interface for top company
interface TopCompany {
  id: string;
  name: string;
  logoUrl?: string;
  rating: number;
  reviews: number;
}

// Interface for enhanced category with stats
interface EnhancedCategory extends Category {
  stats: {
    companies: number;
    reviews: number;
    avgRating: number;
  };
  topCompanies: TopCompany[];
}

const CATEGORIES_PER_PAGE = 5;

const Categories: React.FC<CategoriesProps> = ({ onNavigateToProfile }) => {
  const { translations, language } = useLanguage();
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<EnhancedCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load categories and their stats from Firestore
  const loadCategories = async () => {
    try {
      setLoading(true);
      // 1. Get all categories
      const categoriesQuery = query(collection(db, 'categories'));
      const categoriesSnapshot = await getDocs(categoriesQuery);
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as Category[];
      
      // 2. For each category, get stats and top companies
      const enhancedCategories = await Promise.all(
        categoriesData.map(async (category) => {
          // Get companies in this category
          const companiesQuery = query(
            collection(db, 'companies'),
            where('categoryId', '==', category.id)
          );
          const companiesSnapshot = await getDocs(companiesQuery);
          const companies = companiesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            rating: doc.data().totalRating || doc.data().rating || 0,
            reviews: doc.data().totalReviews || 0
          }));
          
          // Calculate stats
          const totalCompanies = companies.length;
          const totalReviews = companies.reduce((sum, company) => sum + (company.reviews || 0), 0);
          const totalRating = companies.reduce((sum, company) => sum + ((company.rating || 0) * (company.reviews || 1)), 0);
          const avgRating = totalReviews > 0 ? totalRating / totalReviews : 0;
          
          // Get top 5 companies sorted by number of reviews
          const topCompanies = [...companies]
            .sort((a, b) => (b.reviews || 0) - (a.reviews || 0))
            .slice(0, 5)
            .map(company => ({
              id: company.id,
              name: company.name,
              logoUrl: company.logoUrl,
              rating: company.rating || 0,
              reviews: company.reviews || 0
            }));
          
          return {
            ...category,
            stats: {
              companies: totalCompanies,
              reviews: totalReviews,
              avgRating: parseFloat(avgRating.toFixed(1))
            },
            topCompanies
          };
        })
      );
      
      // 3. Sort categories by average rating and then by company count
      const sortedCategories = enhancedCategories.sort((a, b) => {
        // First by rating
        if (b.stats.avgRating !== a.stats.avgRating) {
          return b.stats.avgRating - a.stats.avgRating;
        }
        // Then by company count
        return b.stats.companies - a.stats.companies;
      });
      
      setCategories(sortedCategories);
      setTotalPages(Math.ceil(sortedCategories.length / CATEGORIES_PER_PAGE));
    } catch (error) {
      console.error('Error loading categories:', error);
      setError(translations?.failedToLoadCategories || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Filter categories based on search query and URL parameter
  const filteredCategories = categories.filter(category => {
    // First check if it matches the search query
    const matchesSearch =
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (category.nameAr && category.nameAr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (category.descriptionAr && category.descriptionAr.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Then check if there's a category ID filter from the URL
    if (categoryId && categoryId !== 'all') {
      return category.id === categoryId && matchesSearch;
    }
    
    return matchesSearch;
  });

  // Calculate total pages
  useEffect(() => {
    setTotalPages(Math.ceil(filteredCategories.length / CATEGORIES_PER_PAGE));
    // Reset to first page if current page is now invalid
    if (currentPage > Math.ceil(filteredCategories.length / CATEGORIES_PER_PAGE)) {
      setCurrentPage(1);
    }
  }, [filteredCategories.length]);

  // Paginate categories
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * CATEGORIES_PER_PAGE,
    currentPage * CATEGORIES_PER_PAGE
  );

  // Handle category selection
  const handleCategoryClick = (categoryId: string) => {
    navigate(`/categories/${categoryId}`);
    if (onNavigateToProfile) {
      // Dispatch event to navigate with the selected category filter
      const event = new CustomEvent('navigateToCompaniesWithCategory', {
        detail: { categoryId }
      });
      window.dispatchEvent(event);
    }
  };

  // Handle company click
  const handleCompanyClick = (companyId: string, companyName: string) => {
    if (onNavigateToProfile) {
      onNavigateToProfile(companyId, companyName);
    } else {
      const companySlug = getCompanySlug(companyName);
      navigate(`/company/${companySlug}/${companyId}/overview`);
    }
  };

  // Get category color based on index
  const getCategoryColor = (index: number) => {
    const colors = [
      { bg: 'rgba(25, 72, 102, 0.1)', text: '#194866', border: '#194866', gradientFrom: '#194866', gradientTo: '#1E6091' },
      { bg: 'rgba(238, 24, 63, 0.1)', text: '#EE183F', border: '#EE183F', gradientFrom: '#EE183F', gradientTo: '#F54B6B' },
      { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', border: '#10B981', gradientFrom: '#10B981', gradientTo: '#34D399' },
      { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6', border: '#8B5CF6', gradientFrom: '#8B5CF6', gradientTo: '#A78BFA' },
      { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', border: '#F59E0B', gradientFrom: '#F59E0B', gradientTo: '#FBBF24' }
    ];
    
    return colors[index % colors.length];
  };

  // Handle pagination
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      // Scroll to top of the category section
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      // Scroll to top of the category section
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle "View All Companies" button click
  const handleViewAllCompanies = (categoryId: string) => {
    navigate(`/search?category=${categoryId}`);
    if (onNavigateToProfile) {
      // Navigate to search results page with category filter
      const event = new CustomEvent('navigateToSearch', {
        detail: { query: '', category: categoryId }
      });
      window.dispatchEvent(event);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{translations?.loadingCategories || 'Loading categories...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{translations?.errorLoadingData || 'Error Loading Data'}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            {translations?.retry || 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: '#194866' }}>
              {translations?.browseAllCategories || 'Browse All Categories'}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-8">
              {translations?.discoverCategoriesDesc || 'Explore real estate categories and find the specialized services you need'}
            </p>

            {/* Search */}
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={translations?.searchCategories || 'Search categories...'}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                className="w-full pl-12 rtl:pr-12 rtl:pl-6 pr-6 py-4 text-gray-800 text-lg rounded-xl border border-gray-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white"
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
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Categories Count and Pagination Info */}
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {filteredCategories.length} {translations?.categories || 'Categories'}
              </h2>
              <p className="text-gray-600 mt-1">
                {translations?.selectCategoryBelow || 'Select a category below to explore companies'}
              </p>
            </div>
            
            {/* Pagination Info */}
            {filteredCategories.length > 0 && totalPages > 1 && (
              <div className="text-sm text-gray-500 mt-2 sm:mt-0">
                {translations?.pageInfo?.replace('{current}', currentPage.toString()).replace('{total}', totalPages.toString()) || 
                 `Page ${currentPage} of ${totalPages}`}
              </div>
            )}
          </div>

          {/* Categories List */}
          {filteredCategories.length > 0 ? (
            <div className="space-y-12">
              {paginatedCategories.map((category, index) => {
                const color = getCategoryColor(index);
                
                return (
                  <div 
                    key={category.id}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-transparent"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-3">
                      {/* Category Info */}
                      <div 
                        className="p-8 cursor-pointer" 
                        style={{ background: `linear-gradient(135deg, ${color.gradientFrom} 0%, ${color.gradientTo} 100%)` }}
                        onClick={() => handleCategoryClick(category.id)}
                      >
                        <div className="h-full flex flex-col justify-between">
                          <div>
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6">
                              {category.iconUrl ? (
                                <img 
                                  src={category.iconUrl} 
                                  alt={category.name}
                                  className="w-10 h-10" 
                                />
                              ) : (
                                <Building2 className="w-10 h-10 text-white" />
                              )}
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-4">
                              {language === 'ar' ? (category.nameAr || category.name) : category.name}
                            </h3>
                            {(category.description || category.descriptionAr) && (
                              <p className="text-white/90 mb-6 line-clamp-3">
                                {language === 'ar' ? (category.descriptionAr || category.description) : category.description}
                              </p>
                            )}
                          </div>
                          
                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-2 text-white/90 mt-4">
                            <div className="text-center p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                              <div className="text-xl font-bold text-white">{category.stats.companies}</div>
                              <div className="text-xs">{translations?.registeredCompanies || 'Companies'}</div>
                            </div>
                            <div className="text-center p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                              <div className="text-xl font-bold text-white">{category.stats.reviews}</div>
                              <div className="text-xs">{translations?.totalReviews || 'Reviews'}</div>
                            </div>
                            <div className="text-center p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                              <div className="text-xl font-bold text-white">{category.stats.avgRating}</div>
                              <div className="text-xs">{translations?.averageRating || 'Avg Rating'}</div>
                            </div>
                          </div>
                          
                          <button 
                            className="mt-6 inline-flex items-center space-x-2 rtl:space-x-reverse bg-white/20 backdrop-blur-sm text-white py-3 px-4 rounded-lg hover:bg-white/30 transition-all duration-200 self-start"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewAllCompanies(category.id);
                            }}
                          >
                            <span>{translations?.viewAllCompanies || 'View All Companies'}</span>
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Top Companies */}
                      <div className="lg:col-span-2 p-8">
                        <h4 className="text-lg font-bold text-gray-900 mb-4">
                          {translations?.topCompanies || 'Top Companies'} ({language === 'ar' ? (category.nameAr || category.name) : category.name})
                        </h4>
                        
                        {category.topCompanies.length > 0 ? (
                          <div className="space-y-4">
                            {category.topCompanies.map((company) => (
                              <div 
                                key={company.id}
                                className="flex items-center border border-gray-100 p-4 rounded-xl hover:bg-gray-50 cursor-pointer transition-all duration-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCompanyClick(company.id, company.name);
                                }}
                              >
                                {/* Company Logo */}
                                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden mr-4 rtl:ml-4 rtl:mr-0 flex-shrink-0">
                                  {company.logoUrl ? (
                                    <img
                                      src={company.logoUrl}
                                      alt={company.name}
                                      className="w-full h-full object-contain p-2"
                                    />
                                  ) : (
                                    <Building2 className="w-8 h-8 text-gray-400" />
                                  )}
                                </div>
                                
                                {/* Company Info */}
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-gray-900 truncate">{company.name}</h5>
                                  <div className="flex items-center mt-1">
                                    <div className="flex">
                                      {[...Array(5)].map((_, i) => (
                                        <Star 
                                          key={i}
                                          className={`w-4 h-4 ${i < Math.round(company.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                        />
                                      ))}
                                    </div>
                                    <span className="text-sm text-gray-500 ml-2">
                                      ({company.reviews} {translations?.reviews || 'reviews'})
                                    </span>
                                  </div>
                                </div>
                                
                                {/* View Details */}
                                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-gray-50 rounded-xl">
                            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">
                              {translations?.noCompaniesInCategory || 'No companies in this category yet'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl shadow-md">
              <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {translations?.noCategoriesFound || 'No Categories Found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {translations?.adjustSearchCriteriaCategories || 'Try adjusting your search criteria'}
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                {translations?.clearSearch || 'Clear Search'}
              </button>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredCategories.length > 0 && totalPages > 1 && (
            <div className="flex justify-center mt-12">
              <div className="flex items-center space-x-4 rtl:space-x-reverse">
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                  className="w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-700" />
                </button>
                
                <div className="text-sm">
                  <span className="font-medium">{currentPage}</span> / {totalPages}
                </div>
                
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ArrowRight className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Categories;