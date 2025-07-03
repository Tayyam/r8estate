import React, { useState, useRef, useEffect } from 'react';
import { Search, Star, ArrowRight } from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { useLanguage } from '../contexts/LanguageContext';
import { getCompanySlug } from '../utils/urlUtils';
import { doc, getDoc } from 'firebase/firestore';

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
    <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-4xl mx-auto">
      {/* Search Input */}
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
                        <div className="w-5 h-5 text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 22h20V2L2 22z"></path>
                            <path d="M17 22V7L2 22h15z"></path>
                          </svg>
                        </div>
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
      
      {/* Advanced Search Button - Below search input */}
      <div className="mt-4 text-center">
        <button
          onClick={handleSearch}
          className="px-8 py-3 rounded-xl font-medium text-white transition-all duration-200 shadow-md hover:shadow-xl"
          style={{ backgroundColor: '#EE183F' }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#c71535';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#EE183F';
          }}
        >
          {translations?.advancedSearch || 'بحث متقدم'}
        </button>
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