import React, { useState, useRef } from 'react';
import { Search, Building2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { Category } from '../../types/company';

interface HeroSectionProps {
  onNavigate?: (page: string) => void;
  onSearch?: (query: string, category: string) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, onSearch }) => {
  const { translations, language } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Handle search form submission
  const handleSearch = () => {
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(searchQuery, selectedCategory);
    } else {
      navigate(`/search?q=${encodeURIComponent(searchQuery || '')}&category=${selectedCategory || 'all'}`);
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

  // Handle clicks outside search suggestions
  React.useEffect(() => {
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

  return (
    <section style={{ backgroundColor: '#EFF5FF' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: '#194866' }}>
            {translations?.heroTitle || 'Egypt\'s Premier Real Estate Review Platform'}
          </h1>
          <p className="text-xl md:text-2xl mb-12" style={{ color: '#194866', opacity: 0.8 }}>
            {translations?.heroSubtitle || 'Discover and review the best properties and developers in Egypt. Real reviews from real customers'}
          </p>

          {/* Search Section */}
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5 relative">
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
                
                {/* Search Suggestions placeholder - would be populated from actual data */}
                {showSuggestions && searchQuery.trim() !== '' && (
                  <div 
                    ref={suggestionsRef}
                    className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                  >
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                      {translations?.companies || 'Companies'}
                    </div>
                    {searchSuggestions.length === 0 && (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        {translations?.noCompaniesFound || 'No companies found'}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="md:col-span-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-6 py-4 text-gray-800 text-lg rounded-xl border border-gray-300 focus:ring-2 focus:ring-opacity-50 outline-none transition-all duration-200 bg-white appearance-none"
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
                >
                  <option value="all">{translations?.allCategories || 'All Categories'}</option>
                  {/* Categories would be populated here */}
                </select>
              </div>
              <div className="md:col-span-3">
                <button
                  onClick={handleSearch}
                  className="w-full text-white px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center space-x-2 rtl:space-x-reverse shadow-lg hover:shadow-xl"
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
            </div>

            {/* Share Experience CTA */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-gray-600 text-lg mb-4">
                {translations?.shareExperiencePrompt || 'Just had an experience with a company?'}
              </p>
              <button
                onClick={handleShareExperience}
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
        </div>
      </div>
    </section>
  );
};

export default HeroSection;