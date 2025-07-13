import React from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface SearchHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: Function;
  onNavigate: Function;
  totalResults: number;
  language?: string;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  handleSearch,
  onNavigate,
  totalResults,
  language = 'ar'
}) => {
  const { translations, direction } = useLanguage();

  return (
    <section className="bg-gradient-to-br from-blue-50 to-gray-50 py-12 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#194866', textShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            {translations?.searchResults || 'Search Results'}
              ? translations?.searchFor?.replace('{query}', searchQuery) || `Search for "${searchQuery}"`
              : translations?.searchResults || 'Search Results'
            }
          </h1>
          {searchQuery && (
            <p className="text-lg text-gray-600 mb-2">
              {translations?.searchFor?.replace('{query}', searchQuery) || `Searching for "${searchQuery}"`}
            </p>
          )}
          <p className="text-lg text-gray-600 mb-8">
            <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
              {totalResults} {translations?.resultsFound || 'results found'}
            </span>
          </p>

          {/* Enhanced Search Bar */}
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={translations?.searchPlaceholder || 'Search companies...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="block w-full pl-10 pr-14 py-4 border-2 border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-opacity-50 focus:outline-none transition duration-300 ease-in-out shadow-sm"
              style={{ 
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
                focusBorderColor: '#EE183F',
                focusRingColor: '#EE183F'
              }}
              dir={direction}
            />
            <div className="absolute inset-y-0 right-0 flex items-center">
              <button 
                onClick={() => handleSearch()}
                className="h-full px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-r-xl hover:from-blue-700 hover:to-blue-800 transition duration-300 ease-in-out"
                style={{ 
                  background: 'linear-gradient(to right, #194866, #1a5c82)',
                  borderRadius: language === 'ar' ? '0.75rem 0 0 0.75rem' : '0 0.75rem 0.75rem 0'
                }}
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SearchHeader;