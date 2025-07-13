import React from 'react';
import { ChevronDown, Loader } from 'lucide-react';
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
      <div className="text-center py-12">
        <div className="inline-flex items-center space-x-2 rtl:space-x-reverse text-gray-500">
          <div className="h-px bg-gray-300 w-16"></div>
          <span className="text-sm font-medium">{translations?.endOfResults || 'End of results'}</span>
          <div className="h-px bg-gray-300 w-16"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <button
        onClick={loadMore}
        disabled={loading}
        className="inline-flex items-center space-x-2 rtl:space-x-reverse px-8 py-4 bg-white text-primary-700 rounded-xl font-medium border-2 border-primary-500 hover:bg-primary-50 transition-all duration-300 shadow-md hover:shadow-xl disabled:opacity-50"
        style={{ color: '#194866', borderColor: '#194866' }}
      >
        {loading ? (
          <Loader className="h-5 w-5 animate-spin text-primary-700" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
        <span>{translations?.loadMoreResults || 'Load More Results'}</span>
      </button>
    </div>
  );
};

export default SearchPagination;