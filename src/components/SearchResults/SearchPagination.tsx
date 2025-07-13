import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface SearchPaginationProps {
  hasMore: boolean;
  loading: boolean;
  loadMore: () => void;
}

const SearchPagination: React.FC<SearchPaginationProps> = ({
  hasMore,
  loading,
  loadMore
}) => {
  const { translations } = useLanguage();

  if (!hasMore) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center space-x-2 rtl:space-x-reverse text-gray-500">
          <div className="h-px bg-gray-300 w-8"></div>
          <span className="text-sm">{translations?.endOfResults || 'End of results'}</span>
          <div className="h-px bg-gray-300 w-8"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <button
        onClick={loadMore}
        disabled={loading}
        className="inline-flex items-center space-x-2 rtl:space-x-reverse px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <ChevronDown className="h-5 w-5" />
        )}
        <span>{translations?.loadMoreResults || 'Load More Results'}</span>
      </button>
    </div>
  );
};

export default SearchPagination;