import React from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface SearchHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: () => void;
  onNavigate?: (page: string) => void;
  totalResults: number;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  handleSearch,
  onNavigate,
  totalResults
}) => {
  const { translations } = useLanguage();

  return (
    <section className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <button
            onClick={() => onNavigate ? onNavigate('home') : null}
            className="flex items-center space-x-2 rtl:space-x-reverse text-gray-600 hover:text-gray-800 transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>{translations?.backToHome || 'Back to Home'}</span>
          </button>
        </div>
        
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#194866' }}>
            {searchQuery 
              ? translations?.searchFor?.replace('{query}', searchQuery) || `Search for "${searchQuery}"`
              : translations?.searchResults || 'Search Results'
            }
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            {translations?.foundResults?.replace('{count}', totalResults.toString()) || 
             `Found ${totalResults} result${totalResults === 1 ? '' : 's'}`}
          </p>

          {/* Search Bar */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 rtl:right-4 rtl:left-auto top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={translations?.searchPlaceholder || 'Search companies...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
              }}
export default SearchHeader;