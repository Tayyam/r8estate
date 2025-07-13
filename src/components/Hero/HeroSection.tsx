import React, { useState, useRef, useEffect } from 'react';
import { Search, Building2, ArrowRight, Star, ChevronDown, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Category } from '../../types/company';

interface HeroSectionProps {
  onNavigate?: (page: string) => void;
  onSearch?: (query: string, category: string) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, onSearch }) => {
  const { translations, language } = useLanguage();
  const navigate = useNavigate();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [clearButtonVisible, setClearButtonVisible] = useState(false);
  
  // Category dropdown state
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  // Refs for click outside handling
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  
  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const categoriesQuery = query(
          collection(db, 'categories'),
          orderBy('name'),
          limit(10)
        );
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as Category[];
        
        setCategories(categoriesData);
        setFilteredCategories(categoriesData);
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
        setFilteredCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  // Filter categories based on search query
  useEffect(() => {
    if (categorySearchQuery.trim() === '') {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(category =>
        category.name?.toLowerCase().includes(categorySearchQuery.toLowerCase()) || 
        (category.nameAr && category.nameAr.toLowerCase().includes(categorySearchQuery.toLowerCase()))
      );
      setFilteredCategories(filtered);
    }
  }, [categorySearchQuery, categories]);
  
  // Show/hide clear button based on search query
  useEffect(() => {
    if (searchQuery) {
      setClearButtonVisible(true);
    } else {
      setClearButtonVisible(false);
    }
  }, [searchQuery]);

  // Handle search suggestions
  const fetchSearchSuggestions = async (searchQueryText: string) => {
    if (!searchQueryText.trim() || searchQueryText.length < 2) {
      setSuggestionsLoading(false);
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    setSuggestionsLoading(true);
    setShowSuggestions(true);
    
    try {
      const companiesQuery = searchQueryText.length >= 3 
        ? query(
            collection(db, 'companies'),
            where('name', '>=', searchQueryText),
            where('name', '<=', searchQueryText + '\uf8ff'),
            limit(5)
          )
        : query(
            collection(db, 'companies'),
            orderBy('name'),
            limit(5)
          );
          
      const companiesSnapshot = await getDocs(companiesQuery);
      const suggestionsData = companiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
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
  }, [searchQuery]);
  
  // Handle clicks outside search suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close search suggestions
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
        && !searchContainerRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
      
      // Check if click is within search container but outside suggestions
      if (searchContainerRef.current?.contains(event.target as Node) && !suggestionsRef.current?.contains(event.target as Node)) {
      }
      
      // Close category dropdown
      if (
        categoryDropdownRef.current && 
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
        setCategorySearchQuery('');
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
    if (onSearch) {
      onSearch(searchQuery, selectedCategory);
    } else {
      // Create URL with parameters
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('q', searchQuery);
      }
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      navigate(`/search?${params.toString()}`);
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

  // Handle clear search button click
  const handleClearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(false);
  };
  
  // Handle category dropdown toggle
  const handleCategoryDropdownToggle = () => {
    setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
    if (isCategoryDropdownOpen) {
      setCategorySearchQuery('');
    }
  };
  
  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsCategoryDropdownOpen(false);
    setCategorySearchQuery('');
  };
  
  // Get selected category name
  const getSelectedCategoryName = () => {
    if (selectedCategory === 'all') return translations?.allCategories || 'All Categories';
    const category = categories.find(cat => cat.id === selectedCategory);
    return language === 'ar' 
      ? (category?.nameAr || category?.name || translations?.allCategories || 'All Categories')
      : (category?.name || translations?.allCategories || 'All Categories');
  };
  
  // Format review count for display
  const formatReviewCount = (count: number) => {
    if (count >= 1000) {
      return `${Math.floor(count / 1000)}K`;
    }
    return count.toString();
  };

  return (
    <section className="relative bg-gradient-to-br from-blue-50 to-gray-50 py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6" style={{ color: '#194866' }}>
            {translations?.heroTitle || 'منصة تقييم القطاع العقاري الأولى في مصر'}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-2">
            {translations?.heroSubtitle || 'اكتشف وقيم أفضل العقارات والمطورين في مصر. تقييمات حقيقية من عملاء حقيقيين'}
          </p>
        </div>
        
        {/* Enhanced Search Bar with Categories */}
        <div className="max-w-3xl mx-auto relative" ref={searchContainerRef}>
          <div className="flex bg-white rounded-xl shadow-2xl border-2 border-gray-100 hover:border-gray-200 transition-all duration-300 overflow-hidden hover:shadow-blue-100/30">
            
            {/* Main Search Input */}
            <div className="relative flex-1">
              <div className="flex items-center h-full w-full">
                <div className="absolute left-4 rtl:right-4 rtl:left-auto text-gray-400">
                  <Search className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={translations?.searchPlaceholder || 'ابحث عن شركة...'}
                  className="w-full h-full pl-12 rtl:pr-12 rtl:pl-4 pr-4 py-4 text-lg focus:outline-none transition-all duration-200"
                  dir={language === 'ar' ? 'rtl' : 'ltr'}
                  onFocus={() => {
                    if (searchQuery.length >= 2) {
                      setShowSuggestions(true);
                      fetchSearchSuggestions(searchQuery);
                    }
                  }}
                />
                {/* Clear input button */}
                {clearButtonVisible && (
                  <button 
                    onClick={handleClearSearch}
                    className="absolute top-1/2 transform -translate-y-1/2 right-4 rtl:left-4 rtl:right-auto text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    aria-label="Clear search"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Vertical Separator */}
            <div className="w-px bg-gray-200"></div>

            {/* Enhanced Category Dropdown */}
            <div className="relative flex-shrink-0" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={handleCategoryDropdownToggle}
                className="h-full px-6 py-4 text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2 rtl:space-x-reverse whitespace-nowrap focus:outline-none focus:bg-blue-50/30"
                aria-expanded={isCategoryDropdownOpen}
                aria-haspopup="listbox"
              >
                <span className="text-sm font-medium truncate max-w-40 min-w-32">
                  {getSelectedCategoryName()}
                </span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${
                  isCategoryDropdownOpen ? 'rotate-180' : ''
                }`} />
              </button>

              {/* Category Dropdown Menu */}
              {isCategoryDropdownOpen && (
                <div className="absolute top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-72 max-h-96 overflow-hidden animate-fadeIn">
                  {/* Search Input for Categories */}
                  <div className="p-3 border-b border-gray-100 bg-gray-50">
                    <div className="relative">
                      <div className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400">
                        <Search className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                        placeholder={translations?.searchCategories || 'البحث في الفئات...'}
                        className="w-full pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all duration-200 hover:border-gray-400"
                        dir={language === 'ar' ? 'rtl' : 'ltr'}
                      />
                    </div>
                  </div>

                  {/* Scrollable Category List */}
                  <div className="max-h-72 overflow-y-auto">
                    {loadingCategories ? (
                      <div className="px-4 py-6 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-gray-500 text-sm">{translations?.loadingCategories || 'جاري تحميل الفئات...'}</p>
                      </div>
                    ) : (
                      <>
                        {/* All Categories Option */}
                        <button
                          type="button"
                          onClick={() => handleCategorySelect('all')}
                          className={`w-full text-left rtl:text-right px-4 py-3 hover:bg-gray-50 transition-colors duration-200 ${
                            selectedCategory === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            <X className="h-4 w-4" />
                            <span className="font-medium">{translations?.allCategories || 'جميع الفئات'}</span>
                          </div>
                        </button>
                        
                        {/* Categories List */}
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map((category) => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => handleCategorySelect(category.id)}
                              className={`w-full text-left rtl:text-right px-4 py-3 hover:bg-gray-50 transition-colors duration-200 ${
                                selectedCategory === category.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <span className="truncate">
                                  {language === 'ar' ? (category.nameAr || category.name) : category.name}
                                </span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center text-gray-500 text-sm">
                            {translations?.noCategoriesFound || 'لم يتم العثور على فئات'}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Vertical Separator */}
            <div className="w-px bg-gray-200"></div>

            {/* Search Button */}
            <button
              type="button"
              onClick={handleSearch} 
              className="px-6 lg:px-8 py-4 flex items-center justify-center space-x-2 rtl:space-x-reverse bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-300"
              style={{ backgroundColor: '#194866' }}
            >
              <Search className="h-5 w-5" />
              <span className="font-medium hidden sm:inline">
                {translations?.search || 'بحث'}
              </span>
            </button>
          </div>
          
          {/* Search Suggestions Dropdown */}
          {showSuggestions && (
             <div 
               ref={suggestionsRef}
               className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-40 max-h-96 overflow-y-auto animate-fadeIn"
               style={{ minHeight: suggestionsLoading ? '150px' : 'auto' }}
             >
              {/* Loading State */}
              {suggestionsLoading && (
                 <div className="p-6 text-center">
                   <div className="flex flex-col items-center justify-center">
                     <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-3"></div>
                     <p className="text-gray-500 text-sm">{translations?.searching || 'جاري البحث...'}</p>
                   </div>
                 </div>
              )}
              
              {/* No Results */}
              {!suggestionsLoading && searchSuggestions.length === 0 && searchQuery.length >= 2 && (
                <div className="p-6 text-center">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-gray-500">{translations?.noResults || 'لا توجد نتائج'}</p>
                </div>
              )}
              
              {/* Search Results */}
              {!suggestionsLoading && searchSuggestions.length > 0 && (
                <div className="p-4">
                   <div className="flex items-center space-x-2 rtl:space-x-reverse mb-3 pb-2 border-b border-gray-100">
                     <Building2 className="h-5 w-5 text-blue-600" />
                     <h3 className="font-bold text-gray-900 text-lg">{translations?.companies || 'الشركات'}</h3>
                     <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{searchSuggestions.length}</span>
                  </div>
                  
                  <div className="space-y-0.5 divide-y divide-gray-50">
                    {searchSuggestions.map((company) => (
                      <button
                        key={company.id}
                        className="w-full text-left rtl:text-right hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200"
                        onClick={() => {
                          setSearchQuery(company.name);
                          setShowSuggestions(false);
                          if (onNavigate) {
                            onNavigate('company', company.id);
                          } else {
                            navigate(`/company/${company.id}`);
                          }
                        }}
                      >
                        {/* Enhanced Company Info Layout */}
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          {/* Company Logo */}
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                            {company.logoUrl ? (
                              <img 
                                src={company.logoUrl} 
                                alt={company.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building2 className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          
                          {/* Company Info */}
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-1">
                               <div className="flex items-center bg-green-500 rounded px-2 py-0.5">
                                 <Star className="h-3 w-3 text-white fill-current" />
                                 <span className="font-medium text-white text-xs ml-0.5">
                                   {company.totalRating.toFixed(1)}
                                 </span>
                               </div>
                               <span className="text-xs text-gray-500">
                                 ({formatReviewCount(company.totalReviews)})
                                {categories.find(cat => cat.id === company.categoryId)?.name || ''}
                              </div>
                           <button
                             key={category.id}
                             type="button"
                             onClick={() => handleCategorySelect(category.id)}
                             className={`w-full text-left rtl:text-right px-4 py-3 hover:bg-gray-50 transition-colors duration-200 ${
                               selectedCategory === category.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                             }`}
                             role="option"
                             aria-selected={selectedCategory === category.id}
                           >
                             <div className="flex items-center space-x-2 rtl:space-x-reverse">
                               <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                               <span className="truncate">
                                </span>
                              )}
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
        <div className="text-center mt-14">
          <div className="inline-flex items-center bg-white px-6 py-3 rounded-full text-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105" onClick={handleShareExperience}>
            <span>{translations?.shareExperiencePrompt || 'لسه طالع من تجربة مع شركة؟'}</span>
            <span className="ml-2 px-4 py-1.5 bg-blue-600 text-white rounded-full flex items-center space-x-1 rtl:space-x-reverse shadow-md" style={{ backgroundColor: '#194866' }}>
              <span>{translations?.shareWithUs || 'شاركها معانا'}</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </section>

    {/* Add keyframe animations for a smoother UI */}
    <style jsx>{`
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .animate-fadeIn {
        animation: fadeIn 0.2s ease-out forwards;
      }
    `}
    </style>
  );
};

export default HeroSection;