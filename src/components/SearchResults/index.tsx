import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs, limit, startAfter, getDoc, doc, DocumentData } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Category, egyptianGovernorates } from '../../types/company';
import SearchHeader from './SearchHeader';
import SearchFilters from './SearchFilters';
import SearchResultsList from './SearchResultsList';
import SearchPagination from './SearchPagination';

interface SearchResultsProps {
  onNavigate?: (page: string) => void;
  onNavigateToProfile?: (companyId: string, companyName: string) => void;
  initialSearchQuery?: string;
  initialCategoryFilter?: string;
}

const ITEMS_PER_PAGE = 9;

const SearchResults: React.FC<SearchResultsProps> = ({ 
  onNavigate, 
  onNavigateToProfile, 
  initialSearchQuery,
  initialCategoryFilter
}) => {
  const { translations, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  // Get search parameters from URL
  const searchParams = new URLSearchParams(location.search);
  const urlSearchQuery = searchParams.get('q') || '';
  const urlCategoryFilter = searchParams.get('category') || 'all';

  // State
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || urlSearchQuery);
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter || urlCategoryFilter);
  const [locationFilter, setLocationFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('highestRated');
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [lastDoc, setLastDoc] = useState<DocumentData | null>(null);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesRef = collection(db, 'categories');
        const categoriesSnapshot = await getDocs(categoriesRef);
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

  // Search companies function
  const searchCompanies = useCallback(async (loadMore = false) => {
    try {
      setLoading(true);
      
      // Create base query
      let companyRef = collection(db, 'companies');
      let queryConstraints: any[] = [];
      
      // Apply category filter
      if (categoryFilter !== 'all') {
        queryConstraints.push(where('categoryId', '==', categoryFilter));
      }
      
      // Apply location filter
      if (locationFilter !== 'all') {
        queryConstraints.push(where('location', '==', locationFilter));
      }
      
      // Apply sort order
      let orderByField = 'totalRating';
      let orderDirection: 'desc' | 'asc' = 'desc';
      
      switch (sortOrder) {
        case 'highestRated':
          orderByField = 'totalRating';
          orderDirection = 'desc';
          break;
        case 'mostReviewed':
          orderByField = 'totalReviews';
          orderDirection = 'desc';
          break;
        case 'newest':
          orderByField = 'createdAt';
          orderDirection = 'desc';
          break;
        case 'oldest':
          orderByField = 'createdAt';
          orderDirection = 'asc';
          break;
      }
      
      queryConstraints.push(orderBy(orderByField, orderDirection));
      
      // Pagination
      if (loadMore && lastDoc) {
        queryConstraints.push(startAfter(lastDoc));
      }
      
      queryConstraints.push(limit(ITEMS_PER_PAGE));
      
      // Execute query
      const q = query(companyRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);
      
      // Process results
      const companiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      }));
      
      // Filter by search query and rating client-side
      let filteredCompanies = companiesData;
      
      // Apply search query filter
      if (searchQuery) {
        filteredCompanies = filteredCompanies.filter(company => 
          company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (company.description && company.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }
      
      // Apply rating filter
      if (ratingFilter !== 'all') {
        const minRating = parseInt(ratingFilter);
        filteredCompanies = filteredCompanies.filter(company => 
          (company.totalRating || company.rating || 0) >= minRating
        );
      }
      
      // Update companies state
      if (loadMore) {
        setCompanies(prev => [...prev, ...filteredCompanies]);
      } else {
        setCompanies(filteredCompanies);
        
        // For total count, we need a separate query without limit
        if (queryConstraints.length > 1) { // If we have filters beyond just ordering
          const countQuery = query(companyRef, ...queryConstraints.filter(c => !c.hasOwnProperty('limit')));
          const countSnapshot = await getDocs(countQuery);
          
          // Filter the count results with the same client-side filters
          let countResults = countSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          if (searchQuery) {
            countResults = countResults.filter(company => 
              company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (company.description && company.description.toLowerCase().includes(searchQuery.toLowerCase()))
            );
          }
          
          if (ratingFilter !== 'all') {
            const minRating = parseInt(ratingFilter);
            countResults = countResults.filter(company => 
              (company.totalRating || company.rating || 0) >= minRating
            );
          }
          
          setTotalResults(countResults.length);
        } else {
          // If no special filters, the total count is just the total number of companies
          const countQuery = query(companyRef);
          const countSnapshot = await getDocs(countQuery);
          setTotalResults(countSnapshot.docs.length);
        }
      }
      
      // Update pagination state
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null);
      setHasMore(querySnapshot.docs.length === ITEMS_PER_PAGE);
      
      setInitialLoad(false);
    } catch (error) {
      console.error('Error searching companies:', error);
      setInitialLoad(false);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, locationFilter, ratingFilter, sortOrder, lastDoc]);

  // Execute search on mount and when search parameters change
  useEffect(() => {
    // Reset pagination when filters change
    setLastDoc(null);
    setCompanies([]);
    setHasMore(true);
    
    searchCompanies(false);
    
    // Update URL with search parameters
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    
    navigate(`/search?${params.toString()}`, { replace: true });
  }, [searchQuery, categoryFilter, locationFilter, ratingFilter, sortOrder]);

  // Load more results
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      searchCompanies(true);
    }
  };

  // Handle search button click
  const handleSearch = () => {
    // Reset filters
    setLastDoc(null);
    setCompanies([]);
    setHasMore(true);
    
    searchCompanies(false);
  };

  // Navigate to company profile
  const handleNavigateToProfile = (companyId: string, companyName: string) => {
    if (onNavigateToProfile) {
      onNavigateToProfile(companyId, companyName);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setCategoryFilter('all');
    setLocationFilter('all');
    setRatingFilter('all');
    setSortOrder('highestRated');
  };

  // Check if any filters are applied
  const hasFilters = categoryFilter !== 'all' || locationFilter !== 'all' || ratingFilter !== 'all' || sortOrder !== 'highestRated';

  return (
    <div className="min-h-screen bg-gray-50">
      <SearchHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleSearch={handleSearch}
        onNavigate={onNavigate}
        totalResults={totalResults}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SearchFilters
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          locationFilter={locationFilter}
          setLocationFilter={setLocationFilter}
          ratingFilter={ratingFilter}
          setRatingFilter={setRatingFilter}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          categories={categories}
          hasFilters={hasFilters}
          handleClearFilters={handleClearFilters}
        />
        
        <SearchResultsList
          companies={companies}
          categories={categories}
          loading={initialLoad}
          onNavigateToProfile={handleNavigateToProfile}
        />
        
        {!initialLoad && companies.length > 0 && (
          <SearchPagination
            hasMore={hasMore}
            loading={loading}
            loadMore={handleLoadMore}
          />
        )}
      </div>
    </div>
  );
};

export default SearchResults;