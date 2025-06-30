import React, { useState, useEffect } from 'react';
import { Search, Star, Filter, MapPin, Building2, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { collection, getDocs, query, orderBy, where, limit, startAfter, DocumentData } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { Company } from '../types/company';
import { Category, egyptianGovernorates } from '../types/company';

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
  onNavigateToProfile: (companyId: string) => void;
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
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryFilter);
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
  const [showFilters, setShowFilters] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

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
    const loadCompanies = async () => {
      if (!initialSearchQuery && initialCategoryFilter === 'all') {
        // If no initial filters are applied, load all companies
        loadAllCompanies();
      } else {
        // Otherwise, apply initial filters
        searchCompanies();
      }
    };

    loadCompanies();
  }, [initialSearchQuery, initialCategoryFilter]);

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
  }, [searchQuery]);

  // Load all companies with pagination
  const loadAllCompanies = async (loadMore = false) => {
    try {
      setLoading(true);
      
      let companiesQuery = query(
        collection(db, 'companies'),
        orderBy('rating', 'desc'),
        limit(COMPANIES_PER_PAGE)
      );

      if (loadMore && lastDoc) {
        companiesQuery = query(
          collection(db, 'companies'),
          orderBy('rating', 'desc'),
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
          orderBy('rating', 'desc'),
          limit(COMPANIES_PER_PAGE)
        );
      } else {
        companiesQuery = query(
          baseQuery,
          orderBy('rating', 'desc'),
          limit(COMPANIES_PER_PAGE)
        );
      }
      
      // Add pagination
      if (loadMore && lastDoc) {
        companiesQuery = query(
          baseQuery,
          ...conditions,
          orderBy('rating', 'desc'),
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

  // Apply search filters
  const handleApplyFilters = () => {
    searchCompanies();
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

  // Handle company click
  const handleCompanyClick = (companyId: string) => {
    onNavigateToProfile(companyId);
  };

  // Handle suggestion click
  const handleSuggestionClick = (companyId: string) => {
    setShowSuggestions(false);
    handleCompanyClick(companyId);
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
    { id: '5', name: translations?.rating5 || '5 Stars' },
    { id: '4', name: translations?.rating4 || '4 Stars' },
    { id: '3', name: translations?.rating3 || '3 Stars' },
    { id: '2', name: translations?.rating2 || '2 Stars' },
    { id: '1', name: translations?.rating1 || '1 Star' },
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
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder={translations?.searchPlaceholder || 'Search companies...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
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
                
                {/* Search Suggestions Dropdown */}
                {showSuggestions && searchQuery.trim() !== '' && (
                  <div 
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
                              {company.totalRating > 0 && (
                                <div className="flex items-center text-xs text-gray-500">
                                  <div className="flex items-center space-x-1 rtl:space-x-reverse">
                                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                    <span>{company.totalRating.toFixed(1)}</span>
                                    <span>({company.totalReviews})</span>
                                  </div>
                                </div>
                              )}
                            </div>
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
              <div>
                <button
                  onClick={handleApplyFilters}
                  className="w-full lg:w-auto text-white px-6 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-md hover:shadow-lg"
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
              <div className="lg:hidden">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="w-full text-gray-700 px-6 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse border border-gray-300"
                >
                  <Filter className="w-5 h-5" />
                  <span>{translations?.filters || 'Filters'}</span>
                  {showFilters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Filters Section - Mobile */}
            <div className={`mt-4 space-y-4 lg:hidden ${showFilters ? 'block' : 'hidden'}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.category || 'Category'}
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white appearance-none"
                >
                  {categoryOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.location || 'Location'}
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white appearance-none"
                >
                  {locationOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {translations?.rating || 'Rating'}
                </label>
                <select
                  value={selectedRating}
                  onChange={(e) => setSelectedRating(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white appearance-none"
                >
                  {ratingOptions.map(option => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <button
                  onClick={handleApplyFilters}
                  className="w-full text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-md"
                  style={{ backgroundColor: '#194866' }}
                >
                  <Filter className="w-5 h-5" />
                  <span>{translations?.applyFilters || 'Apply Filters'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Desktop Filters */}
      <section className="hidden lg:block bg-white border-t border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6 rtl:space-x-reverse">
              {/* Category Filter */}
              <div className="relative">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  {translations?.category || 'Category'}
                </label>
                <div className="relative">
                  <Filter className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white appearance-none"
                  >
                    {categoryOptions.map(option => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Location Filter */}
              <div className="relative">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  {translations?.location || 'Location'}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white appearance-none"
                  >
                    {locationOptions.map(option => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rating Filter */}
              <div className="relative">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  {translations?.rating || 'Rating'}
                </label>
                <div className="relative">
                  <Star className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    value={selectedRating}
                    onChange={(e) => setSelectedRating(e.target.value)}
                    className="pl-10 rtl:pr-10 rtl:pl-3 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white appearance-none"
                  >
                    {ratingOptions.map(option => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Apply Filters Button */}
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 text-white rounded-lg font-medium transition-all duration-200"
              style={{ backgroundColor: '#194866' }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#0f3147';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#194866';
              }}
            >
              {translations?.applyFilters || 'Apply Filters'}
            </button>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading && companies.length === 0 ? (
            <div className="flex justify-center items-center h-60">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
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
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{translations?.noCompaniesFound || 'No Companies Found'}</h3>
              <p className="text-gray-600 mb-6">
                {translations?.adjustSearchCriteria || 'Try adjusting your search criteria or browse all categories'}
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedLocation('all');
                  setSelectedRating('all');
                  loadAllCompanies();
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                {translations?.clearFilters || 'Clear Filters'}
              </button>
            </div>
          ) : (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {companies.length} {translations?.companies || 'Companies'}
                  </h2>
                  <p className="text-gray-600 mt-1">
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
              </div>

              {/* Companies Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden cursor-pointer group"
                    onClick={() => handleCompanyClick(company.id)}
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
                            <MapPin className="w-4 h-4" />
                            <span>{language === 'ar' ? company.locationNameAr : company.locationName}</span>
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
                            handleCompanyClick(company.id);
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
                <div className="text-center mt-12">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>{translations?.loading || 'Loading...'}</span>
                      </div>
                    ) : (
                      translations?.loadMoreResults || 'Load More Results'
                    )}
                  </button>
                </div>
              )}
              
              {/* End of Results Message */}
              {!hasMore && companies.length > 0 && (
                <div className="text-center mt-12">
                  <p className="text-gray-500">
                    {translations?.endOfResults || 'End of results'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default SearchResults;