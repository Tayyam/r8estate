import React from 'react';
import { Star, MapPin, Building2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Category } from '../../types/company';
import { egyptianGovernorates } from '../../types/company';

interface SearchResultItemProps {
  company: any;
  categories: Category[];
  onNavigateToProfile: (companyId: string, companyName: string) => void;
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({
  company,
  categories,
  onNavigateToProfile
}) => {
  const { translations, language } = useLanguage();
  
  // Get category name with language support
  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? (language === 'ar' ? (category.nameAr || category.name) : category.name) : 'Unknown Category';
  };
  
  // Get location name with language support
  const getLocationName = (locationId: string): string => {
    const location = egyptianGovernorates.find(loc => loc.id === locationId);
    return location ? (language === 'ar' ? (location.nameAr || location.name) : location.name) : locationId;
  };
  
  // Calculate average rating
  const rating = company.totalRating || company.rating || 0;

  return (
    <div 
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100 hover:border-primary-500 transform hover:translate-y-[-5px]"
      style={{ '--hover-border-color': '#194866' } as React.CSSProperties}
      onClick={() => onNavigateToProfile(company.id, company.name)}
    >
      {/* Company Logo/Image */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 rtl:md:space-x-reverse">
          <div className="flex items-start space-x-4 rtl:space-x-reverse mb-4 md:mb-0">
            {/* Company Logo */}
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <Building2 className="h-8 w-8 text-gray-400" />
              )}
            </div>
            
            {/* Company Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 mb-1">{company.name}</h3>
              <div className="text-sm text-gray-600 mb-2">
                {getCategoryName(company.categoryId)}
              </div>
              
              {/* Rating */}
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${
                        i < Math.round(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`} 
                    />
                  ))}
                </div>
                <span className="font-bold text-gray-900">
                  {rating.toFixed(1)}
                </span>
                <span className="text-gray-500 text-sm">
                  ({company.totalReviews || 0} {translations?.reviews || 'reviews'})
                </span>
              </div>
              
              {/* Location */}
              <div className="flex items-center text-gray-600 mt-2">
                <MapPin className="h-4 w-4 flex-shrink-0 mr-1 rtl:ml-1 rtl:mr-0" />
                <span className="text-sm">{getLocationName(company.location)}</span>
              </div>
            </div>
          </div>
          
          {/* View Details Button */}
          <div className="mt-4 md:mt-0 flex-shrink-0">
            <button className="w-full md:w-auto flex items-center justify-center space-x-2 rtl:space-x-reverse px-6 py-3 bg-blue-50 text-blue-700 rounded-lg font-medium transition-all duration-300 group hover:bg-blue-100">
              <span>{translations?.viewDetails || 'View Details'}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 transform transition-transform duration-300 group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchResultItem;