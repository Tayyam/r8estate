import React from 'react';
import { Building2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import SearchResultItem from './SearchResultItem';
import { Category } from '../../types/company';

interface SearchResultsListProps {
  companies: any[];
  categories: Category[];
  loading: boolean;
  onNavigateToProfile: (companyId: string, companyName: string) => void;
}

const SearchResultsList: React.FC<SearchResultsListProps> = ({
  companies,
  categories,
  loading,
  onNavigateToProfile
}) => {
  const { translations } = useLanguage();

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500">{translations?.loading || 'Loading...'}</p>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-md">
        <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {translations?.noResultsFound || 'No Results Found'}
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {translations?.tryAnotherSearch || 'Try another search or adjust your filters'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {companies.map((company) => (
        <SearchResultItem
          key={company.id}
          company={company}
          categories={categories}
          onNavigateToProfile={onNavigateToProfile}
        />
      ))}
    </div>
  );
};

export default SearchResultsList;