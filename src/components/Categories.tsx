import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, ChevronRight, Building2, Users, ShieldCheck, Tag, ArrowLeft } from 'lucide-react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { Category } from '../types/company';

interface CategoriesProps {
  onNavigateToProfile?: (companyId: string) => void;
  initialCategoryFilter?: string;
}

const Categories: React.FC<CategoriesProps> = ({ onNavigateToProfile, initialCategoryFilter }) => {
  const { translations, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load categories from Firestore
  const loadCategories = async () => {
    try {
      setLoading(true);
      const categoriesQuery = query(collection(db, 'categories'), orderBy('name'));
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
      setError(translations?.failedToLoadCategories || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Filter categories based on search query
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.nameAr && category.nameAr.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (category.descriptionAr && category.descriptionAr.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle category selection
  const handleCategoryClick = (categoryId: string) => {
    if (onNavigateToProfile) {
      // Dispatch event to navigate with the selected category filter
      const event = new CustomEvent('navigateToCompaniesWithCategory', {
        detail: { categoryId }
      });
      window.dispatchEvent(event);
    }
  };

  // Get category color based on index
  const getCategoryColor = (index: number) => {
    const colors = [
      { bg: 'rgba(25, 72, 102, 0.1)', text: '#194866', border: '#194866', gradientFrom: '#194866', gradientTo: '#1E6091' },
      { bg: 'rgba(238, 24, 63, 0.1)', text: '#EE183F', border: '#EE183F', gradientFrom: '#EE183F', gradientTo: '#F54B6B' },
      { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', border: '#10B981', gradientFrom: '#10B981', gradientTo: '#34D399' },
      { bg: 'rgba(139, 92, 246, 0.1)', text: '#8B5CF6', border: '#8B5CF6', gradientFrom: '#8B5CF6', gradientTo: '#A78BFA' },
      { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', border: '#F59E0B', gradientFrom: '#F59E0B', gradientTo: '#FBBF24' },
      { bg: 'rgba(6, 182, 212, 0.1)', text: '#06B6D4', border: '#06B6D4', gradientFrom: '#06B6D4', gradientTo: '#22D3EE' }
    ];
    
    return colors[index % colors.length];
  };

  // Generate example stats for categories (in a real app, this would come from the database)
  const getCategoryStats = (categoryId: string, index: number) => {
    // These would be real statistics in a production app
    const baseCompanies = 15 + (index * 5);
    const baseReviews = 120 + (index * 30);
    const baseRating = 3.5 + (Math.random() * 1.5);
    
    return {
      companies: baseCompanies,
      reviews: baseReviews,
      avgRating: parseFloat(baseRating.toFixed(1))
    };
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 rtl:pr-12 rtl:pl-6 pr-6 py-4 text-gray-800 rounded-xl border border-gray-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white"
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
          {/* Categories Count */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              {filteredCategories.length} {translations?.categories || 'Categories'}
            </h2>
            <p className="text-gray-600 mt-1">
              {translations?.selectCategoryBelow || 'Select a category below to explore companies'}
            </p>
          </div>

          {/* Categories List */}
          {filteredCategories.length > 0 ? (
            <div className="space-y-8">
              {filteredCategories.map((category, index) => {
                const color = getCategoryColor(index);
                const stats = getCategoryStats(category.id, index);
                
                return (
                  <div 
                    key={category.id}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-transparent cursor-pointer"
                    onClick={() => handleCategoryClick(category.id)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = color.border;
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5">
                      {/* Category Info */}
                      <div className="md:col-span-2 p-8" style={{ background: `linear-gradient(135deg, ${color.gradientFrom} 0%, ${color.gradientTo} 100%)` }}>
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
                                <Tag className="w-10 h-10 text-white" />
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
                          
                          <button 
                            className="inline-flex items-center space-x-2 rtl:space-x-reverse bg-white/20 backdrop-blur-sm text-white py-3 px-4 rounded-lg hover:bg-white/30 transition-all duration-200 self-start"
                          >
                            <span>{translations?.viewAllCompanies || 'View All Companies'}</span>
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Category Details */}
                      <div className="md:col-span-3 p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
                          {/* Companies Stat */}
                          <div className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                            <div className="flex items-center space-x-4 rtl:space-x-reverse">
                              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: color.bg }}>
                                <Building2 className="w-6 h-6" style={{ color: color.text }} />
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-gray-900">{stats.companies}</div>
                                <div className="text-sm text-gray-600">{translations?.registeredCompanies || 'Companies'}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Reviews Stat */}
                          <div className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                            <div className="flex items-center space-x-4 rtl:space-x-reverse">
                              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: color.bg }}>
                                <MessageSquare className="w-6 h-6" style={{ color: color.text }} />
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-gray-900">{stats.reviews}</div>
                                <div className="text-sm text-gray-600">{translations?.totalReviews || 'Reviews'}</div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Rating Stat */}
                          <div className="bg-gray-50 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                            <div className="flex items-center space-x-4 rtl:space-x-reverse">
                              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: color.bg }}>
                                <Star className="w-6 h-6" style={{ color: color.text }} />
                              </div>
                              <div>
                                <div className="text-2xl font-bold text-gray-900">{stats.avgRating}</div>
                                <div className="text-sm text-gray-600">{translations?.averageRating || 'Avg Rating'}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Popular Features/Services */}
                        <div>
                          <h4 className="text-lg font-bold text-gray-900 mb-4">{translations?.popularServicesTitle || 'Popular Services'}</h4>
                          <div className="flex flex-wrap gap-2">
                            {generateFeaturesList(category.id, index).map((feature, i) => (
                              <div 
                                key={i} 
                                className="px-3 py-1.5 rounded-full text-sm font-medium"
                                style={{ backgroundColor: color.bg, color: color.text }}
                              >
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl shadow-md">
              <Tag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
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
        </div>
      </section>
    </div>
  );
};

// Helper function to generate services/features for each category (in a real app, this would come from the database)
function generateFeaturesList(categoryId: string, index: number): string[] {
  const features: { [key: string]: string[] } = {
    // Developer services
    developer: [
      'Residential Properties', 
      'Commercial Properties', 
      'Mixed-Use Developments', 
      'Property Management', 
      'Investment Opportunities'
    ],
    // Broker services
    broker: [
      'Property Sales', 
      'Property Rentals', 
      'Property Valuation', 
      'Market Analysis', 
      'Contract Negotiation'
    ],
    // Consultant services
    consultant: [
      'Feasibility Studies', 
      'Investment Advisory', 
      'Property Valuation', 
      'Market Research', 
      'Development Consultation'
    ],
    // Property Management services
    propertyManagement: [
      'Tenant Management', 
      'Maintenance Services', 
      'Financial Management', 
      'Property Inspection', 
      'Lease Administration'
    ],
    // Default services
    default: [
      'Property Listings',
      'Client Consultations',
      'Market Analysis',
      'Investment Guidance',
      'Property Tours'
    ]
  };
  
  // Select 5 random services based on index to give variety
  const allServices = features[categoryId] || features.default;
  const randomStart = index % (allServices.length - 5 + 1);
  return allServices.slice(randomStart, randomStart + 5);
}

// Helper component for star ratings
const Star = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      {...props}
    >
      <path 
        fillRule="evenodd" 
        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" 
        clipRule="evenodd" 
      />
    </svg>
  );
};

// Helper component for message square
const MessageSquare = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  );
};

export default Categories;