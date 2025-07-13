import React from 'react';
import { Filter, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Category } from '../../types/company';
import { egyptianGovernorates } from '../../types/company';


interface SearchFiltersProps {
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  locationFilter: string;
  setLocationFilter: (value: string) => void;
  ratingFilter: string;
  setRatingFilter: (value: string) => void;
  sortOrder: string;
  setSortOrder: (value: string) => void;
  categories: Category[];
  hasFilters: boolean;
  handleClearFilters: () => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  categoryFilter,
  setCategoryFilter,
  locationFilter,
  setLocationFilter,
  ratingFilter,
  setRatingFilter,
  sortOrder,
  setSortOrder,
  categories,
  hasFilters,
  handleClearFilters
}) => {
  const { translations, language } = useLanguage();

  return (
    <div className="bg-white rounded-xl shadow-md p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Filter className="h-5 w-5 text-gray-500 mr-2 rtl:ml-2 rtl:mr-0" />
          <h3 className="font-semibold text-gray-800">{translations?.filters || 'Filters'}</h3>
        </div>
        
        {hasFilters && (
          <button
            onClick={handleClearFilters}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <X className="h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0" />
            <span>{translations?.clearFilters || 'Clear Filters'}</span>
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category Filter */}
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-2">
            {translations?.category || 'Category'} <span className="text-primary-500">•</span>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm appearance-none bg-white"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: `${language === 'ar' ? 'left 0.5rem center' : 'right 0.5rem center'}`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem',
              paddingLeft: language === 'ar' ? '2.5rem' : undefined
            }}
          >
            <option value="all">{translations?.allCategories || 'All Categories'}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {language === 'ar' ? (category.nameAr || category.name) : category.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Location Filter */}
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-2">
            {translations?.location || 'Location'} <span className="text-primary-500">•</span>
          </div>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm appearance-none bg-white"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: `${language === 'ar' ? 'left 0.5rem center' : 'right 0.5rem center'}`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem',
              paddingLeft: language === 'ar' ? '2.5rem' : undefined
            }}
          >
            <option value="all">{translations?.allLocations || 'All Locations'}</option>
            {egyptianGovernorates.map((location) => (
              <option key={location.id} value={location.id}>
                {language === 'ar' ? (location.nameAr || location.name) : location.name}
              </option>
            ))}
          </select>
        </div>
        
        {/* Rating Filter */}
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-2">
            {translations?.rating || 'Rating'} <span className="text-primary-500">•</span>
          </div>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm appearance-none bg-white"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: `${language === 'ar' ? 'left 0.5rem center' : 'right 0.5rem center'}`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem',
              paddingLeft: language === 'ar' ? '2.5rem' : undefined
            }}
          >
            <option value="all">{translations?.allRatings || 'All Ratings'}</option>
            <option value="5">{translations?.rating5 || '5 Stars'}</option>
            <option value="4">{translations?.rating4 || '4+ Stars'}</option>
            <option value="3">{translations?.rating3 || '3+ Stars'}</option>
            <option value="2">{translations?.rating2 || '2+ Stars'}</option>
            <option value="1">{translations?.rating1 || '1+ Star'}</option>
          </select>
        </div>
        
        {/* Sort Order */}
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-2">
            {translations?.sortBy || 'Sort By'} <span className="text-primary-500">•</span>
          </div>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm appearance-none bg-white"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: `${language === 'ar' ? 'left 0.5rem center' : 'right 0.5rem center'}`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem',
              paddingLeft: language === 'ar' ? '2.5rem' : undefined
            }}
          >
            <option value="highestRated">{translations?.highestRated || 'Highest Rated'}</option>
            <option value="mostReviewed">{translations?.mostReviewed || 'Most Reviewed'}</option>
            <option value="newest">{translations?.newest || 'Newest'}</option>
            <option value="oldest">{translations?.oldest || 'Oldest'}</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;