import React, { useState, useEffect, useRef } from 'react';
import { Search, Star, Filter, MapPin, Building2, ArrowLeft, ChevronDown, ChevronUp, X, Sliders, ChevronRight } from 'lucide-react';
import { collection, getDocs, query, orderBy, where, limit, startAfter, DocumentData } from 'firebase/firestore';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { Company } from '../types/company';
import { Category, egyptianGovernorates } from '../types/company';
import { getCompanySlug } from '../utils/urlUtils';

interface CompanyWithCategory extends Company {
  categoryName: string;
  categoryNameAr?: string;
  locationName: string;
  locationNameAr?: string;
  totalRating: number;
  totalReviews: number;
}

interface SearchResultsProps {
  onNavigate: (page: string) => void;
  onNavigateToProfile?: (companyId: string, companyName: string) => void;
  initialSearchQuery?: string;
  initialCategoryFilter?: string;
}

const COMPANIES_PER_PAGE = 9;

const SearchResults: React.FC<SearchResultsProps> = ({ 
  onNavigate, 
  onNavigateToProfile, 
  initialSearchQuery = '', 
  initialCategoryFilter = 'all' 
}) => {
  const { translations, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || initialCategoryFilter);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedRating, setSelectedRating] = useState('all');
  const [companies, setCompanies] = useState<CompanyWithCategory[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentData | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  
  // UI States
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Update search params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    setSearchParams(params);
  }, [searchQuery, selectedCategory, setSearchParams]);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
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
      }
    };
    
    loadCategories();
  }, []);

  // Load companies based on search query
  useEffect(() => {
    if (categories.length > 0) {
      const q = searchParams.get('q') || '';
      const category = searchParams.get('category') || 'all';
      
      setSearchQuery(q);
      setSelectedCategory(category);
      
      if (!q && category === 'all') {
        // If no filters are applied, load all companies
        loadAllCompanies();
      } else {
        // Otherwise, apply filters
        searchCompanies();
      }
    }
  }, [searchParams, categories.length]);

  // Apply filters automatically when they change
  useEffect(() => {
    if (categories.length > 0) {
      searchCompanies();
    }
  }, [selectedLocation, selectedRating]);

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
        .map(doc => {
          const data = doc.data();
          const company = {
            id: doc.id,
            ...data,
            totalRating: data.totalRating || data.rating || 0,
            totalReviews: data.totalReviews || 0
          };
          
          // Find the category for each company
          const category = categories.find(cat => cat.id === company.categoryId);
          
          return {
            ...company,
            categoryName: category?.name || 'Unknown Category'
          };
        })
        .filter(company => 
          company.name.toLowerCase().includes(lowercaseQuery)
        )
        .slice(0, 5); // Limit to 5 suggestions
      
      setSearchSuggestions(matchingCompanies);
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
  }, [searchQuery, categories]);

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

  // Load all companies with pagination
  const loadAllCompanies = async (loadMore = false) => {
    try {
      setLoading(true);
      
      let companiesQuery = query(
        collection(db, 'companies'),
        orderBy('createdAt', 'desc'),
        limit(COMPANIES_PER_PAGE)
      );

      if (loadMore && lastDoc) {
        companiesQuery = query(
          collection(db, 'companies'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(COMPANIES_PER_PAGE)
        );
      }

      const companiesSnapshot = await getDocs(companiesQuery);
      const companiesData = await processCompaniesData(companiesSnapshot);
      
      // Update state
      if (loadMore) {
        setCompanies(prev => [...prev, ...companiesData]);
      } else {
        setCompanies(companiesData);
        
        // Get total count for first load
        const countQuery = query(
          collection(db, 'companies')
        );
        const countSnapshot = await getDocs(countQuery);
        setTotalResults(countSnapshot.size);
      }

      // Update pagination state
      setLastDoc(companiesSnapshot.docs[companiesSnapshot.docs.length - 1] || null);
      setHasMore(companiesSnapshot.docs.length === COMPANIES_PER_PAGE);
      
    } catch (error) {
      console.error('Error loading companies:', error);
      setError(translations?.failedToLoadCompanies || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  // Search companies with filters
  const searchCompanies = async (loadMore = false) => {
    try {
      setLoading(true);
      setError('');
      
      // Start building the query
      let baseQuery = collection(db, 'companies');
      let conditions: any[] = [];
      
      // Add category filter
      if (selectedCategory !== 'all') {
        conditions.push(where('categoryId', '==', selectedCategory));
      }
      
      // Add location filter
      if (selectedLocation !== 'all') {
        conditions.push(where('location', '==', selectedLocation));
      }
      
      // Add rating filter
      if (selectedRating !== 'all') {
        const minRating = parseInt(selectedRating);
        conditions.push(where('rating', '>=', minRating));
        conditions.push(where('rating', '<', minRating + 1));
      }
      
      // Create query with conditions
      let companiesQuery;
      if (conditions.length > 0) {
        companiesQuery = query(
          baseQuery,
          ...conditions,
          orderBy('createdAt', 'desc'),
          limit(COMPANIES_PER_PAGE)
        );
      } else {
        companiesQuery = query(
          baseQuery,
          orderBy('createdAt', 'desc'),
          limit(COMPANIES_PER_PAGE)
        );
      }
      
      // Add pagination
      if (loadMore && lastDoc) {
        companiesQuery = query(
          baseQuery,
          ...conditions,
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(COMPANIES_PER_PAGE)
        );
      }

      const companiesSnapshot = await getDocs(companiesQuery);
      const companiesData = await processCompaniesData(companiesSnapshot);
      
      // Filter by search term (client-side filtering for name matching)
      const filtered = searchQuery.trim() !== '' 
        ? companiesData.filter(company => 
            company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (company.description && company.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            company.locationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (company.locationNameAr && company.locationNameAr.includes(searchQuery))
          )
        : companiesData;

      // Update state
      if (loadMore) {
        setCompanies(prev => [...prev, ...filtered]);
      } else {
        setCompanies(filtered);
        setTotalResults(filtered.length);
      }

      // Update pagination state
      setLastDoc(companiesSnapshot.docs[companiesSnapshot.docs.length - 1] || null);
      setHasMore(companiesSnapshot.docs.length === COMPANIES_PER_PAGE);
      
      // Update filtered companies
      setFilteredCompanies(filtered);
      
    } catch (error) {
      console.error('Error searching companies:', error);
      setError(translations?.searchError || 'An error occurred while searching');
    } finally {
      setLoading(false);
    }
  };

  // Process companies data to include category and location info
  const processCompaniesData = async (snapshot: any) => {
    const companiesData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    }));
    
    // Get category and location info for each company
    const companiesWithDetails = companiesData.map(company => {
      const category = categories.find(cat => cat.id === company.categoryId);
      const location = egyptianGovernorates.find(gov => gov.id === company.location);
      
      return {
        ...company,
        categoryName: category?.name || 'Unknown Category',
        categoryNameAr: category?.nameAr || category?.name || 'فئة غير معروفة',
        locationName: location?.name || company.location,
        locationNameAr: location?.nameAr || location?.name || company.location,
        totalRating: company.totalRating || company.rating || 0,
        totalReviews: company.totalReviews || 0
      };
    });
    
    return companiesWithDetails;
  };

  // Load more companies
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      if (!searchQuery && selectedCategory === 'all' && selectedLocation === 'all') {
        loadAllCompanies(true);
      } else {
        searchCompanies(true);
      }
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedLocation('all');
    setSelectedRating('all');
    setSearchParams(new URLSearchParams());
    // Filters will auto-apply via the useEffect
  };

  // Handle company click
  const handleCompanyClick = (companyId: string, companyName: string) => {
    // Scroll to top when navigating
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
    
    if (onNavigateToProfile) {
      onNavigateToProfile(companyId, companyName);
    } else {
      const companySlug = getCompanySlug(companyName);
      navigate(`/company/${companySlug}/${companyId}/overview`);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (companyId: string, companyName: string) => {
    setShowSuggestions(false);
    handleCompanyClick(companyId, companyName);
  };

  // Get category color based on category name
  const getCategoryColor = (categoryName: string) => {
    const colors = {
      'Developer': '#194866',
      'Broker': '#EE183F',
      'Consultant': '#10B981',
      'Property Management': '#8B5CF6',
      'مطور عقاري': '#194866',
      'وسيط عقاري': '#EE183F',
      'مستشار عقاري': '#10B981',
      'إدارة الممتلكات': '#8B5CF6'
    };
    return colors[categoryName as keyof typeof colors] || '#6B7280';
  };

  // Apply search
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    setSearchParams(params);
  };

  // Create filter options
  const categoryOptions = [
    { id: 'all', name: translations?.allCategories || 'All Categories' },
    ...categories.map(cat => ({
      id: cat.id,
      name: language === 'ar' ? (cat.nameAr || cat.name) : cat.name
    }))
  ];

  const locationOptions = [
    { id: 'all', name: translations?.allLocations || 'All Locations' },
    ...egyptianGovernorates.map(gov => ({
      id: gov.id,
      name: language === 'ar' ? gov.nameAr : gov.name
    }))
  ];

  const ratingOptions = [
    { id: 'all', name: translations?.allRatings || 'All Ratings' },
    { id: '5', name: translations?.rating5 || '5 Stars', stars: 5 },
    { id: '4', name: translations?.rating4 || '4 Stars', stars: 4 },
    { id: '3', name: translations?.rating3 || '3 Stars', stars: 3 },
    { id: '2', name: translations?.rating2 || '2 Stars', stars: 2 },
    { id: '1', name: translations?.rating1 || '1 Star', stars: 1 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>{translations?.backToHome || 'Back to Home'}</span>
            </button>
          </div>
          
          <div className="text-center mt-6">
            <h1 className="text-3xl font-bold mb-4" style={{ color: '#194866' }}>
              {translations?.searchResults || 'Search Results'}
            </h1>
            <p className="text-gray-600 mb-2">
              {translations?.searchFor?.replace('{query}', searchQuery || translations?.all || 'all') || 
              `Search for "${searchQuery || 'all'}"`}
            </p>
            <p className="text-sm text-gray-500">
              {translations?.foundResults?.replace('{count}', totalResults.toString()) || 
              `Found ${totalResults} results`}
            </p>
          </div>
          
          {/* Search Bar */}
          <div className="mt-8">
            <div className="relative">
              <Search className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={translations?.searchPlaceholder || 'Search companies...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
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
                  // Small delay to allow clicking on suggestions
                  setTimeout(() => setShowSuggestions(false), 150);
                }}
              />
              
              {/* Mobile Filters Toggle Button */}
              <div className="absolute right-4 rtl:left-4 rtl:right-auto top-1/2 transform -translate-y-1/2 lg:hidden">
                <button
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors duration-200 flex items-center justify-center"
                >
                  <Sliders className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
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
                          onClick={() => handleSuggestionClick(company.id, company.name)}
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
                          <ChevronRight className="w-4 h-4 text-gray-400" />
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
          </div>
        </div>
      </section>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar - Desktop */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold" style={{ color: '#194866' }}>
                  {translations?.filters || 'Filters'}
                </h3>
                <button
                  onClick={handleResetFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors duration-200"
                >
                  {translations?.clearFilters || 'Clear Filters'}
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Category Filter */}
                <div className="filter-group">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.category || 'Category'}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    >
                      {categoryOptions.map(option => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                {/* Location Filter */}
                <div className="filter-group">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.location || 'Location'}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    >
                      {locationOptions.map(option => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                {/* Rating Filter - Converted to Dropdown */}
                <div className="filter-group">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {translations?.rating || 'Rating'}
                  </label>
                  <div className="relative">
                    <select
                      value={selectedRating}
                      onChange={(e) => setSelectedRating(e.target.value)}
                      className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                    >
                      {ratingOptions.map(option => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Active Filters Summary */}
                {(selectedCategory !== 'all' || selectedLocation !== 'all' || selectedRating !== 'all' || searchQuery) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {translations?.activeFilters || 'Active Filters'}:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {searchQuery && (
                        <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <span className="truncate max-w-[100px]">{searchQuery}</span>
                          <button 
                            onClick={() => {
                              setSearchQuery('');
                              const newParams = new URLSearchParams(searchParams);
                              newParams.delete('q');
                              setSearchParams(newParams);
                            }}
                            className="ml-1 p-0.5 hover:bg-blue-200 rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {selectedCategory !== 'all' && (
                        <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <span>{categoryOptions.find(o => o.id === selectedCategory)?.name}</span>
                          <button 
                            onClick={() => {
                              setSelectedCategory('all');
                              const newParams = new URLSearchParams(searchParams);
                              newParams.delete('category');
                              setSearchParams(newParams);
                            }}
                            className="ml-1 p-0.5 hover:bg-blue-200 rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {selectedLocation !== 'all' && (
                        <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <span>{locationOptions.find(o => o.id === selectedLocation)?.name}</span>
                          <button 
                            onClick={() => setSelectedLocation('all')}
                            className="ml-1 p-0.5 hover:bg-blue-200 rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      {selectedRating !== 'all' && (
                        <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <span className="flex items-center">
                            {ratingOptions.find(o => o.id === selectedRating)?.name}
                          </span>
                          <button 
                            onClick={() => setSelectedRating('all')}
                            className="ml-1 p-0.5 hover:bg-blue-200 rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Filters Drawer */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div 
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={() => setShowMobileFilters(false)}
              ></div>
              <div className="absolute inset-y-0 right-0 max-w-xs w-full bg-white shadow-xl flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold" style={{ color: '#194866' }}>
                    {translations?.filters || 'Filters'}
                  </h3>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Category Filter */}
                  <div className="filter-group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {translations?.category || 'Category'}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                      >
                        {categoryOptions.map(option => (
                          <option key={option.id} value={option.id}>{option.name}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Location Filter */}
                  <div className="filter-group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {translations?.location || 'Location'}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                      >
                        {locationOptions.map(option => (
                          <option key={option.id} value={option.id}>{option.name}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Rating Filter - Converted to Dropdown */}
                  <div className="filter-group">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {translations?.rating || 'Rating'}
                    </label>
                    <div className="relative">
                      <select
                        value={selectedRating}
                        onChange={(e) => setSelectedRating(e.target.value)}
                        className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                      >
                        {ratingOptions.map(option => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Active Filters Summary - Mobile */}
                  {(selectedCategory !== 'all' || selectedLocation !== 'all' || selectedRating !== 'all') && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        {translations?.activeFilters || 'Active Filters'}:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCategory !== 'all' && (
                          <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                            <span>{categoryOptions.find(o => o.id === selectedCategory)?.name}</span>
                            <button 
                              onClick={() => setSelectedCategory('all')}
                              className="ml-1 p-0.5 hover:bg-blue-200 rounded-full"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {selectedLocation !== 'all' && (
                          <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                            <span>{locationOptions.find(o => o.id === selectedLocation)?.name}</span>
                            <button 
                              onClick={() => setSelectedLocation('all')}
                              className="ml-1 p-0.5 hover:bg-blue-200 rounded-full"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {selectedRating !== 'all' && (
                          <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                            <span>{ratingOptions.find(o => o.id === selectedRating)?.name}</span>
                            <button 
                              onClick={() => setSelectedRating('all')}
                              className="ml-1 p-0.5 hover:bg-blue-200 rounded-full"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-4 border-t border-gray-200">
                  <div className="flex space-x-3">
                    <button
                      onClick={handleResetFilters}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                    >
                      {translations?.clearFilters || 'Clear Filters'}
                    </button>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      {translations?.applyFilters || 'Apply Filters'} ({totalResults})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Content */}
          <div className="flex-1">
            {/* Filter Bar - Mobile */}
            <div className="lg:hidden mb-6">
              <button
                onClick={() => setShowMobileFilters(true)}
                className="w-full px-4 py-3 bg-white rounded-xl border border-gray-300 shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center">
                  <Filter className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-gray-700">{translations?.filters || 'Filters'}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>
                    {[
                      selectedCategory !== 'all' ? categoryOptions.find(o => o.id === selectedCategory)?.name : null,
                      selectedLocation !== 'all' ? locationOptions.find(o => o.id === selectedLocation)?.name : null,
                      selectedRating !== 'all' ? ratingOptions.find(o => o.id === selectedRating)?.name : null
                    ].filter(Boolean).join(', ') || translations?.allResults || 'All Results'}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            </div>

            {/* Results Status */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {companies.length} {translations?.companies || 'Companies'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedCategory !== 'all' 
                      ? categoryOptions.find(opt => opt.id === selectedCategory)?.name 
                      : (translations?.allCategories || 'All Categories')
                    }
                    {selectedLocation !== 'all' && (
                      <span> - {locationOptions.find(opt => opt.id === selectedLocation)?.name}</span>
                    )}
                    {selectedRating !== 'all' && (
                      <span> - {ratingOptions.find(opt => opt.id === selectedRating)?.name}</span>
                    )}
                  </p>
                </div>
                {/* Reset Filters Button - Desktop */}
                <button
                  onClick={handleResetFilters}
                  className="hidden lg:flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
                >
                  <X className="h-4 w-4" />
                  <span>{translations?.clearFilters || 'Clear Filters'}</span>
                </button>
              </div>
            </div>

            {/* Results Grid */}
            {loading && companies.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Building2 className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-red-500">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 mt-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {translations?.retry || 'Retry'}
                </button>
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-md">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{translations?.noCompaniesFound || 'No Companies Found'}</h3>
                <p className="text-gray-600 mb-6">
                  {translations?.adjustSearchCriteria || 'Try adjusting your search criteria or browse all categories'}
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {translations?.clearFilters || 'Clear Filters'}
                </button>
              </div>
            ) : (
              <>
                {/* Companies Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      className="bg-white rounded-3xl shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden cursor-pointer group"
                      onClick={() => handleCompanyClick(company.id, company.name)}
                    >
                      {/* Company Image */}
                      <div className="relative h-48">
                        {company.logoUrl ? (
                          <img
                            src={company.logoUrl}
                            alt={company.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <Building2 className="h-16 w-16 text-gray-400" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        
                        {/* Verified Badge */}
                        {company.verified && (
                          <div className="absolute top-4 left-4 rtl:right-4 rtl:left-auto">
                            <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 rtl:space-x-reverse">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span>{translations?.verified || 'Verified'}</span>
                            </div>
                          </div>
                        )}

                        {/* Rating Badge */}
                        {company.totalRating > 0 && (
                          <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto">
                            <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center space-x-1 rtl:space-x-reverse">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              <span className="font-semibold text-gray-900">{company.totalRating.toFixed(1)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Company Content */}
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-gray-700 transition-colors">
                              {company.name}
                            </h3>
                            <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-gray-500 mb-3">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{language === 'ar' ? company.locationNameAr : company.locationName}</span>
                            </div>
                          </div>
                        </div>

                        {company.description && (
                          <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-2">
                            {company.description.substring(0, 120)}
                            {company.description.length > 120 && '...'}
                          </p>
                        )}

                        {/* Stats Row */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4 rtl:space-x-reverse">
                            {company.totalReviews > 0 && (
                              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-sm text-gray-600">{company.totalReviews}</span>
                                <span className="text-sm text-gray-500">{translations?.reviews || 'reviews'}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Category Badge */}
                        <div className="flex items-center justify-between">
                          <span 
                            className="px-3 py-1 rounded-full text-sm font-medium text-white"
                            style={{ backgroundColor: getCategoryColor(company.categoryName) }}
                          >
                            {language === 'ar' ? company.categoryNameAr : company.categoryName}
                          </span>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCompanyClick(company.id, company.name);
                            }}
                            className="text-sm font-medium flex items-center space-x-1 rtl:space-x-reverse transition-colors duration-200 hover:scale-105"
                            style={{ color: '#194866' }}
                            onMouseEnter={(e) => {
                              e.target.style.color = '#EE183F';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.color = '#194866';
                            }}
                          >
                            <span>{translations?.viewDetails || 'View Details'}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center mt-10">
                    <button
                      onClick={handleLoadMore}
                      disabled={loading}
                      className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center mx-auto space-x-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>{translations?.loading || 'Loading...'}</span>
                        </>
                      ) : (
                        <>
                          <span>{translations?.loadMoreResults || 'Load More Results'}</span>
                          <ChevronDown className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                {/* End of Results Message */}
                {!hasMore && companies.length > 0 && (
                  <div className="text-center mt-10">
                    <p className="text-gray-500">
                      {translations?.endOfResults || 'End of results'}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add custom style for better filter UI */}
      <style jsx>{`
        .filter-group {
          position: relative;
          transition: all 0.2s ease;
        }
        
        .filter-group:hover {
          transform: translateY(-1px);
        }
        
        .filter-group select:focus {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
};

export default SearchResults;