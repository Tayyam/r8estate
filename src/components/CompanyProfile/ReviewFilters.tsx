import React from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ReviewFiltersProps {
  ratingFilter: 'all' | 1 | 2 | 3 | 4 | 5;
  timeFilter: 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year';
  sortFilter: 'newest' | 'oldest' | 'highest-rating' | 'lowest-rating';
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  setRatingFilter: (rating: 'all' | 1 | 2 | 3 | 4 | 5) => void;
  setTimeFilter: (time: 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year') => void;
  setSortFilter: (sort: 'newest' | 'oldest' | 'highest-rating' | 'lowest-rating') => void;
  hasFilters: boolean;
  handleClearFilters: () => void;
}

const ReviewFilters: React.FC<ReviewFiltersProps> = ({
  ratingFilter,
  timeFilter,
  sortFilter,
  showFilters,
  setShowFilters,
  setRatingFilter,
  setTimeFilter,
  setSortFilter,
  hasFilters,
  handleClearFilters
}) => {
  const { translations } = useLanguage();

  return (
    <div className="mt-8 mb-6">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 text-sm"
      >
        <Filter className="h-4 w-4" />
        <span>{translations?.filterReviews || 'Filter Reviews'}</span>
        {showFilters ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg mt-3 border border-gray-100 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.filterByRating || 'Filter by Rating'}
              </label>
              <select
                value={ratingFilter as string}
                onChange={(e) => {
                  const value = e.target.value;
                  setRatingFilter(value === 'all' ? 'all' : Number(value) as 1 | 2 | 3 | 4 | 5);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">{translations?.allRatings || 'All Ratings'}</option>
                <option value="5">★★★★★ (5)</option>
                <option value="4">★★★★☆ (4)</option>
                <option value="3">★★★☆☆ (3)</option>
                <option value="2">★★☆☆☆ (2)</option>
                <option value="1">★☆☆☆☆ (1)</option>
              </select>
            </div>
            
            {/* Time Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.filterByTime || 'Filter by Time'}
              </label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">{translations?.allTime || 'All Time'}</option>
                <option value="today">{translations?.today || 'Today'}</option>
                <option value="yesterday">{translations?.yesterday || 'Yesterday'}</option>
                <option value="week">{translations?.pastWeek || 'Past Week'}</option>
                <option value="month">{translations?.pastMonth || 'Past Month'}</option>
                <option value="year">{translations?.pastYear || 'Past Year'}</option>
              </select>
            </div>
            
            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {translations?.sortOrder || 'Sort Order'}
              </label>
              <select
                value={sortFilter}
                onChange={(e) => setSortFilter(e.target.value as 'newest' | 'oldest' | 'highest-rating' | 'lowest-rating')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="newest">{translations?.newestFirst || 'Newest First'}</option>
                <option value="oldest">{translations?.oldestFirst || 'Oldest First'}</option>
                <option value="highest-rating">{translations?.highestRating || 'Highest Rating'}</option>
                <option value="lowest-rating">{translations?.lowestRating || 'Lowest Rating'}</option>
              </select>
            </div>
          </div>
          
          {/* Filter Actions */}
          <div className="flex justify-end mt-4">
            <button
              onClick={handleClearFilters}
              disabled={!hasFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {translations?.clearFilters || 'Clear Filters'}
            </button>
          </div>
          
          {/* Filter Results Count */}
          <div className="mt-2 text-sm text-gray-500 animate-fadeIn">
            {translations?.showingFilteredReviews?.replace('{count}', filteredReviews?.length?.toString() || '0').replace('{total}', reviews?.length?.toString() || '0') || 
            `Showing ${filteredReviews?.length || 0} of ${reviews?.length || 0} reviews`}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewFilters;