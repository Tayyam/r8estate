import React, { useState, useRef, useEffect } from 'react';
import { Search, Star, Building2, MapPin, ArrowRight } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { getCompanySlug } from '../utils/urlUtils';
import { doc, getDoc } from 'firebase/firestore';
import { getRatingColorClass } from './Hero';

interface HeroSearchBarProps {
  onSearch?: (query: string, category: string) => void;
}

const HeroSearchBar: React.FC<HeroSearchBarProps> = ({ onSearch }) => {
  const { translations, language } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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

          // Get location name
          let locationName = company.location || "";
          
          return {
            ...company,
            categoryName,
            locationName
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
      onSearch(searchQuery, 'all');
    } else {
      navigate(`/search?q=${encodeURIComponent(searchQuery || '')}`);
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (companyId: string, companyName: string) => {
    setShowSuggestions(false);
    const companySlug = getCompanySlug(companyName);
    navigate(`/company/${companySlug}/${companyId}/overview`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-2xl shadow-xl overflow-hidden">
        {/* Search Input - Made more prominent */}
        <div className="relative">
          <div className="bg-white flex items-center px-2 py-1">
            <div className="w-12 h-12 flex items-center justify-center">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
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
              className="w-full py-4 px-2 text-lg border-none ring-0 focus:ring-0 focus:outline-none placeholder-gray-400"
              autoFocus
            />
          </div>
          
          {/* Search Suggestions Dropdown - Styled like the company list in the image */}
          {showSuggestions && searchQuery.trim() !== '' && (
            <div 
              ref={suggestionsRef}
              className="absolute z-50 inset-x-0 bg-white border-t border-gray-100 shadow-lg overflow-hidden max-h-[calc(100vh-200px)] overflow-y-auto"
            >
              {suggestionsLoading ? (
                <div className="flex items-center justify-center py-6 px-4">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-3"></div>
                  <span className="text-gray-500">{translations?.loading || 'Loading...'}</span>
                </div>
              ) : searchSuggestions.length > 0 ? (
                <>
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500">
                      {translations?.companies || 'Companies'}
                    </h3>
                  </div>
                  
                  {/* Company suggestions styled like the image */}
                  <div className="divide-y divide-gray-100">
                    {searchSuggestions.map(company => (
                      <div 
                        key={company.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                        onClick={() => handleSuggestionClick(company.id, company.name)}
                      >
                        <div className="px-6 py-4 flex items-center justify-between">
                          <div className="flex items-start space-x-3 rtl:space-x-reverse flex-1">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                              {company.logoUrl ? (
                                <img 
                                  src={company.logoUrl} 
                                  alt={company.name}
                                  className="w-full h-full object-contain p-1" 
                                />
                              ) : (
                                <Building2 className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 mb-1 truncate">
                                {company.name}
                              </div>
                              <div className="flex items-center text-xs text-gray-500">
                                <span className="truncate mr-2">{company.categoryName}</span>
                                {company.locationName && (
                                  <div className="flex items-center text-xs text-gray-400">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    <span className="truncate">{company.locationName}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Rating Badge with TrustPilot-style colors */}
                          {company.totalRating > 0 && (
                            <div className={`flex-shrink-0 px-3 py-1 rounded-md ${getRatingColorClass(company.totalRating)} font-semibold text-sm flex items-center space-x-1 rtl:space-x-reverse`}>
                              <Star className="w-4 h-4 fill-current" />
                              <span>{company.totalRating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-center">
                    <button
                      onClick={handleSearch}
                      className="text-blue-600 font-medium text-sm flex items-center space-x-1 rtl:space-x-reverse hover:text-blue-800 transition-colors"
                    >
                      <span>{translations?.viewAll || 'View all results'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  <p>{translations?.noCompaniesFound || 'No companies found'}</p>
                  <button
                    onClick={handleSearch}
                    className="mt-2 text-blue-600 font-medium text-sm hover:underline"
                  >
                    {translations?.search || 'Search'} "{searchQuery}"
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Advanced Search Button - Below search input */}
        <div className="bg-gray-50 px-6 py-3 text-center">
          <button
            onClick={handleSearch}
            className="px-8 py-2 rounded-lg font-medium text-white transition-all duration-200"
            style={{ backgroundColor: '#EE183F' }}
          >
            {translations?.advancedSearch || 'بحث متقدم'}
          </button>
        </div>
      </div>

      {/* Share Experience CTA */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <p className="text-gray-600 text-lg mb-4">
          {translations?.shareExperiencePrompt || 'Just had an experience with a company?'}
        </p>
        <button
          onClick={() => navigate('/search')}
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
  );
};

export default HeroSearchBar;