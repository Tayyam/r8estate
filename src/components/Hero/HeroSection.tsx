import React, { useState, useRef, useEffect } from 'react';
import { Search, Building2, ArrowRight, Star, X, ChevronDown, Tag, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCompanySlug } from '../../utils/urlUtils';
import { useLanguage } from '../../contexts/LanguageContext';
import { collection, query, where, getDocs, orderBy, limit, DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Category } from '../../types/company';

interface HeroSectionProps {
  onNavigate?: (page: string) => void;
  onSearch?: (query: string, category: string) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, onSearch }) => {
  const { translations, language } = useLanguage();
  const navigate = useNavigate();
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>(translations?.allCategories || 'All Categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  
  // Refs for click outside handling
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  
  // Load categories for dropdown
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesQuery = query(collection(db, 'categories'));
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
      }
    };
    
    loadCategories();
  }, []);
  
  // Update selected category name when language changes or categories load
  useEffect(() => {
    if (selectedCategory === 'all') {
      setSelectedCategoryName(translations?.allCategories || 'All Categories');
    } else {
      const category = categories.find(c => c.id === selectedCategory);
      if (category) {
        setSelectedCategoryName(language === 'ar' ? (category.nameAr || category.name) : category.name);
      }
    }
  }, [selectedCategory, categories, language, translations]);
  
  // Handle search suggestions
  const fetchSearchSuggestions = async (searchQueryText: string) => {
    if (!searchQueryText.trim() || searchQueryText.length < 2) {
      setSearchSuggestions([]);
      return;
    }
    
    setSuggestionsLoading(true);
    setShowSuggestions(true);
    
    try {
      const searchQueryLower = searchQueryText.toLowerCase();
      
      const companiesQuery = query(
        collection(db, 'companies'),
        ...(selectedCategory !== 'all' ? [where('categoryId', '==', selectedCategory)] : []),
        where('name', '>=', searchQueryText),
        where('name', '<=', searchQueryText + '\uf8ff'), 
        limit(5)
      );
          
      const companiesSnapshot = await getDocs(companiesQuery);
      const suggestionsData = companiesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(company => company.name.toLowerCase().includes(searchQueryLower));
      
      setSearchSuggestions(suggestionsData);
    } catch (error) {
      console.error('Error fetching search suggestions:', error);
      setSearchSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };
  
  // Debounced search suggestions
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        fetchSearchSuggestions(searchQuery);
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      setShowSuggestions(false);
      setSearchSuggestions([]);
    }
  }, [searchQuery, selectedCategory]);
  
  // Handle clicks outside search suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close search suggestions
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
  
  // Handle clicks outside category dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current && 
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle search form submission
  const handleSearch = () => {
    setShowSuggestions(false);
    setShowCategoryModal(false);
    if (onSearch) {
      onSearch(searchQuery, selectedCategory);
    } else {
      navigate(`/search?q=${encodeURIComponent(searchQuery || '')}&category=${selectedCategory}`);
    }
  };
  
  // Handle share experience button click
  const handleShareExperience = () => {
    if (onNavigate) {
      onNavigate('search-results');
    } else {
      navigate('/search');
    }
  };
  
  // Format review count for display
  const formatReviewCount = (count: number) => {
    if (count >= 1000) {
      return `${Math.floor(count / 1000)}K`;
    }
    return count.toString();
  };

  // Get rating badge color based on rating value
  const getRatingBadgeColor = (rating: number): string => {
    if (rating >= 4.5) return "bg-green-500"; // 4.5-5: Green
    if (rating >= 3.5) return "bg-lime-500";  // 3.5-4.4: Lime green
    if (rating >= 2.5) return "bg-yellow-500"; // 2.5-3.4: Yellow
    if (rating >= 1.5) return "bg-orange-500"; // 1.5-2.4: Orange
    return "bg-red-500";                       // 1-1.4: Red
  };

  const handleSelectCategory = (categoryId: string, categoryName: string) => {
    setSelectedCategory(categoryId);
    setSelectedCategoryName(categoryName);
    setShowCategoryModal(false);
  };

  return (
    <section className="relative bg-gradient-to-br from-blue-50 to-gray-50 py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6" style={{ color: '#194866' }}>
            {translations?.heroTitle || 'The Primary Real Estate Sector Review Platform in Egypt'}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
            {translations?.heroSubtitle || 'Discover and review the best real estate and developers in Egypt. Real reviews from real customers'}
          </p>
        </div>
        
        {/* Search Bar - Simplified without Categories */}
        <div className="max-w-3xl mx-auto relative">
          <div className="flex bg-white rounded-xl shadow-2xl border-2 border-gray-100 hover:border-gray-200 transition-colors duration-300 overflow-hidden">
            {/* Text Input Field */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={translations?.searchPlaceholder || 'Search for a company...'}
                className="w-full pl-12 rtl:pr-12 rtl:pl-3 pr-3 py-4 text-lg focus:outline-none"
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              />
              {/* Clear input button */}
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 transform -translate-y-1/2 right-3 rtl:left-3 rtl:right-auto text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            
            {/* Category Button */}
            <div className="border-l border-gray-200 rtl:border-l-0 rtl:border-r">
              <button
                type="button"
                onClick={() => setShowCategoryModal(true)}
                className="h-full px-4 py-4 text-gray-700 font-medium flex items-center space-x-2 rtl:space-x-reverse hover:bg-gray-50 transition-colors duration-200"
              >
                <Tag className="h-4 w-4 flex-shrink-0" />
                <span className="truncate max-w-[120px] hidden sm:inline">
                  {selectedCategoryName}
                </span>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </button>
            </div>

            {/* Search Button */}
            <button
              type="button"
              onClick={handleSearch}
              className="px-4 lg:px-6 py-4 flex items-center justify-center space-x-2 rtl:space-x-reverse text-white transition-colors duration-300"
              style={{ backgroundColor: '#194866' }}
            >
              <Search className="h-5 w-5" />
              <span className="font-medium hidden sm:inline">
                {translations?.search || 'Search'}
              </span>
            </button>
          </div>
          
          {/* Search Suggestions Dropdown */}
          {showSuggestions && (
            <div 
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-40 max-h-96 overflow-y-auto"
            >
              {/* Loading State */}
              {suggestionsLoading && (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-500 text-sm">{translations?.searching || 'Searching...'}</p>
                </div>
              )}
              
              {/* No Results */}
              {!suggestionsLoading && searchSuggestions.length === 0 && searchQuery.length >= 2 && (
                <div className="p-6 text-center">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-gray-500">{translations?.noResults || 'No results found'}</p>
                </div>
              )}
              
              {/* Search Results */}
              {!suggestionsLoading && searchSuggestions.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse mb-4">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <h3 className="font-bold text-gray-900 text-lg">{translations?.companies || 'Companies'}</h3>
                  </div>
                  
                  <div className="space-y-1">
                    {searchSuggestions.map((company) => (
                      <button
                        key={company.id}
                        className="w-full text-left hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200 group"
                        onClick={() => {
                          setSearchQuery(company.name);
                          setShowSuggestions(false);
                          // Navigate to company profile
                          const companySlug = getCompanySlug(company.name);
                          if (onNavigate) {
                            // Dispatch event to navigate to company profile
                            const event = new CustomEvent('navigateToCompanyProfile', {
                              detail: { companyId: company.id, companyName: company.name }
                            });
                            window.dispatchEvent(event);
                          } else {
                            navigate(`/company/${companySlug}/${company.id}/overview`);
                          }
                        }}
                      >
                        {/* Company Info Layout */}
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          {/* Company Logo */}
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                            {company.logoUrl ? (
                              <img 
                                src={company.logoUrl} 
                                alt={company.name} 
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              '🏢'
                            )}
                          </div>
                          
                          {/* Company Info */}
                          <div className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition-colors duration-200 flex-shrink-0">
                            {company.name}
                          </div>
                          
                          {/* Review Count */}
                          {company.totalReviews > 0 && (
                            <>
                              <span className="text-gray-400 text-sm">•</span>
                              <span className="text-gray-500 text-sm flex-shrink-0">
                                {formatReviewCount(company.totalReviews)} {translations?.reviews || 'reviews'}
                              </span>
                            </>
                          )}
                          
                          {/* Rating Badge */}
                          <div className="flex-grow"></div>
                          {company.totalRating > 0 && (
                            <div className={`flex items-center space-x-1 rtl:space-x-reverse ${getRatingBadgeColor(company.totalRating)} text-white px-2 py-1 rounded text-xs font-bold flex-shrink-0`}>
                              <Star className="h-3 w-3 fill-current" />
                             <span>{Math.round(company.totalRating * 10) / 10}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Share Experience Button */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center bg-white px-6 py-3 rounded-full text-gray-700 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={handleShareExperience}>
            <span>{translations?.shareExperiencePrompt || 'Had an experience with a company?'}</span>
            <span className="ml-2 px-4 py-1 bg-blue-600 text-white rounded-full flex items-center space-x-1 rtl:space-x-reverse" style={{ backgroundColor: '#194866' }}>
              <span>{translations?.shareWithUs || 'Share it with us'}</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
        {/* Category Selection Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto" onClick={() => setShowCategoryModal(false)}>
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-black opacity-40"></div>
              <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-auto p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    {translations?.selectCategory || 'Select Category'}
                  </h3>
                  <button 
                    onClick={() => setShowCategoryModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  <button
                    onClick={() => handleSelectCategory('all', translations?.allCategories || 'All Categories')}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 text-left transition-colors duration-200"
                  >
                    <span className="font-medium">
                      {translations?.allCategories || 'All Categories'}
                    </span>
                    {selectedCategory === 'all' && (
                      <Check className="h-5 w-5 text-blue-600" />
                    )}
                  </button>
                  
                  {categories.map(category => {
                    const categoryName = language === 'ar' ? (category.nameAr || category.name) : category.name;
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleSelectCategory(category.id, categoryName)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 text-left transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          {category.iconUrl ? (
                            <img src={category.iconUrl} alt={category.name} className="w-6 h-6" />
                          ) : (
                            <Building2 className="h-5 w-5 text-gray-400" />
                          )}
                          <span className="font-medium">
                            {categoryName}
                          </span>
                        </div>
                        {selectedCategory === category.id && (
                          <Check className="h-5 w-5 text-blue-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
        
    </section>
  );
};

export default HeroSection;