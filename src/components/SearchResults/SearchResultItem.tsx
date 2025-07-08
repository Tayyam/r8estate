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
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:scale-[1.02]"
      onClick={() => onNavigateToProfile(company.id, company.name)}
    >
      {/* Company Logo/Image */}
      <div className="w-full h-48 overflow-hidden relative bg-gray-100">
        {company.logoUrl ? (
          <img
            src={company.logoUrl}
            alt={company.name}
            className="w-full h-full object-contain p-4"
          />
        ) : company.coverImageUrl ? (
          <img
            src={company.coverImageUrl}
            alt={company.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center">
            <Building2 className="h-16 w-16 text-gray-300" />
          </div>
        )}
        
        {/* Verified Badge */}
        {company.claimed && (
          <div className="absolute top-2 right-2 rtl:left-2 rtl:right-auto bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
            {translations?.verified || 'Verified'}
          </div>
        )}
      </div>
      
      {/* Company Details */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="px-3 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: 'rgba(25, 72, 102, 0.1)', color: '#194866' }}>
            {getCategoryName(company.categoryId)}
          </span>
          
          <div className="flex items-center">
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
            <span className="ml-2 text-gray-700 text-sm">
              {rating.toFixed(1)}
            </span>
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2">{company.name}</h3>
        
        <div className="flex items-center text-gray-600 mb-4">
          <MapPin className="h-4 w-4 flex-shrink-0 mr-1 rtl:ml-1 rtl:mr-0" />
          <span className="text-sm">{getLocationName(company.location)}</span>
        </div>
        
        {company.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {company.description}
          </p>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {company.totalReviews || 0} {translations?.reviews || 'reviews'}
          </span>
          <span className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
            {translations?.viewDetails || 'View Details'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SearchResultItem;